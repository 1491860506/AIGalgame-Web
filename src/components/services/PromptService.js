import { readFile } from './IndexedDBFileSystem';

async function processPrompt(kind) {
    try {
        // Load config from localStorage
        const config = JSON.parse(localStorage.getItem('aiGalgameConfig') || '{}');
        
        // Get language and story settings
        const lang = config?.剧情?.language || '中文';
        const storyTitle = config?.剧情?.story_title || '';
        
        // In browser environment, we need to handle paths differently
        const dataPath = `/data/${storyTitle}`;
        
        // Load prompt data from localStorage
        const promptData = config?.提示词 || [];
        
        // Find the target kind
        const target = promptData.find(item => item.kind === kind);
        if (!target) {
            return ['error', 'error'];
        }
        
        // Build content dictionary
        const contentDict = {};
        for (const item of target.content) {
            contentDict[item.id] = {
                prompt: item.prompt || '',
                prompt_var: item.prompt_var || ''
            };
        }
        
        // Language mapping logic
        const langMap = {
            '中文': ['1', '2'],
            '英文': ['3', '4'],
            '日文': ['5', '6']
        };
        
        const ids = langMap[lang] || ['1', '2'];
        let p1 = contentDict[ids[0]]?.prompt || '';
        let p2 = contentDict[ids[1]]?.prompt || '';
        let p1_var = contentDict[ids[0]]?.prompt_var || '';
        let p2_var = contentDict[ids[1]]?.prompt_var || '';
        
        // Fallback logic
        if (!p1.trim() && !p2.trim()) {
            p1 = contentDict['1']?.prompt || '';
            p2 = contentDict['2']?.prompt || '';
            p1_var = contentDict['1']?.prompt_var || '';
            p2_var = contentDict['2']?.prompt_var || '';
            if (!p1.trim() && !p2.trim()) {
                console.error('No prompt templates set');
                return ['error', 'error'];
            }
        }
        
        /**
         * Process prompt_var and apply variable replacements to prompt
         * @param {string} promptText - The prompt template
         * @param {string} promptVarText - The prompt_var text containing variable definitions
         * @returns {Promise<string>} - Processed prompt with variables replaced
         */
        async function processPromptWithVars(promptText, promptVarText) {
            // If either input is empty, handle appropriately
            if (!promptText.trim()) {
                return '';
            }
            
            // Parse and process variables from prompt_var
            const variables = await parsePromptVars(promptVarText);
            
            // Replace variables in the prompt text
            let processedPrompt = promptText;
            
            // Replace {{var}} format variables with their values
            for (const [varName, varValue] of Object.entries(variables)) {
                const regex = new RegExp(`{{${varName}}}`, 'g');
                processedPrompt = processedPrompt.replace(regex, varValue || '');
            }
            
            return processedPrompt.replace(',}','}').replace(/\s+\n/g, "\n");
        }
        
        /**
         * Evaluates a string expression that may contain variables and concatenation
         * @param {string} expr - The expression to evaluate
         * @param {Object} variables - The variables object
         * @returns {string} - The evaluated result
         */
        function evaluateExpression(expr, variables) {
          // Handle string concatenation with + operator
          if (expr.includes('+')) {
              // Split by + but preserve quoted strings
              const tokens = [];
              let currentToken = '';
              let inQuote = false;
              let quoteType = '';
              
              for (let i = 0; i < expr.length; i++) {
                  const char = expr[i];
                  
                  if ((char === '"' || char === "'") && (i === 0 || expr[i-1] !== '\\')) {
                      inQuote = !inQuote || quoteType !== char;
                      if (inQuote && quoteType !== char) {
                          quoteType = char;
                      } else if (!inQuote) {
                          quoteType = '';
                      }
                      currentToken += char;
                  } else if (char === '+' && !inQuote) {
                      if (currentToken.trim()) {
                          tokens.push(currentToken.trim());
                      }
                      currentToken = '';
                  } else {
                      currentToken += char;
                  }
              }
              
              if (currentToken.trim()) {
                  tokens.push(currentToken.trim());
              }
              
              // Evaluate each token and concatenate
              let result = '';
              for (const token of tokens) {
                  // 递归评估每个标记，处理嵌套表达式
                  const evalToken = token.trim();
                  if ((evalToken.startsWith('"') && evalToken.endsWith('"')) || 
                      (evalToken.startsWith("'") && evalToken.endsWith("'"))) {
                      // 如果是字符串字面量，去除引号
                      result += evalToken.substring(1, evalToken.length - 1);
                  } else if (variables[evalToken] !== undefined) {
                      // 如果是变量
                      result += variables[evalToken];
                  } else {
                      // 如果可能是更复杂的表达式或未知变量
                      result += evalToken;
                  }
              }
              
              return result;
          }
          
          // Handle direct string literal
          if ((expr.startsWith('"') && expr.endsWith('"')) || 
              (expr.startsWith("'") && expr.endsWith("'"))) {
              return expr.substring(1, expr.length - 1);
          }
          
          // Handle variable
          return variables[expr] !== undefined ? variables[expr] : expr;
        }
        
        /**
         * Parse prompt_var text line by line to extract variable definitions
         * @param {string} promptVarText - The prompt_var text
         * @returns {Promise<Object>} - Object containing variable name/value pairs
         */
        async function parsePromptVars(promptVarText) {
            const variables = {};
            
            if (!promptVarText.trim()) {
                return variables;
            }
            
            const lines = promptVarText.split('\n');
            
            for (const line of lines) {
                const trimmedLine = line.trim();
                if (!trimmedLine) continue;
                
                // Try to match each of the types of variable definitions
                let matched = false;
                
                // Type 0: Direct variable assignment - format: varName="value" or varName=otherVar or varName=expr1+expr2+...
                const directAssignMatch = trimmedLine.match(/^(\w+)\s*=\s*(.+)$/);
                if (directAssignMatch && !trimmedLine.includes('readfile(') && !trimmedLine.includes('readconfig(') && !trimmedLine.startsWith('if(')) {
                    matched = true;
                    const varName = directAssignMatch[1];
                    const valueExpr = directAssignMatch[2].trim();
                    
                    // Evaluate the expression (handles string literals, variables, and concatenation)
                    variables[varName] = evaluateExpression(valueExpr, variables);
                }
                
                // Type 1: Read file content - format: varName=readfile(path,number) or readfile(path)
                const readFileMatch = trimmedLine.match(/^(\w+)\s*=\s*readfile\((.*)\)$/);
                if (!matched && readFileMatch) {
                    matched = true;
                    const varName = readFileMatch[1];
                    const args = readFileMatch[2].split(',').map(arg => arg.trim());
                    
                    // Resolve path and line count variables if needed
                    let filePath = args[0];
                    let lineCount = undefined;
                    
                    // Evaluate the filepath expression
                    filePath = evaluateExpression(filePath, variables);
                    
                    // Process line count parameter if present
                    if (args.length > 1) {
                        const lineCountArg = args[1];
                        // Check if lineCount is a variable or a number literal
                        if (isNaN(lineCountArg)) {
                            // It's a variable name or expression
                            const lineCountValue = evaluateExpression(lineCountArg, variables);
                            lineCount = !isNaN(lineCountValue) ? parseInt(lineCountValue) : undefined;
                        } else {
                            lineCount = parseInt(lineCountArg);
                        }
                    }
                    
                    try {
                        // Construct full path
                        let fullPath;
                        if (filePath.startsWith('/data/')) {
                            fullPath = filePath;
                        } else if (filePath.startsWith('/')) {
                            fullPath = `/data/${storyTitle}${filePath}`;
                        } else {
                            fullPath = `${dataPath}/${filePath}`;
                        }
                        
                        // Read the file
                        let content = await readFile(fullPath);
                        
                        // Convert content to string if it's not already
                        if (content === null || content === undefined) {
                            content = '';
                        } else if (typeof content !== 'string') {
                            if (content instanceof Blob) {
                                content = await new Promise((resolve) => {
                                    const reader = new FileReader();
                                    reader.onload = () => resolve(reader.result);
                                    reader.onerror = () => resolve('');
                                    reader.readAsText(content);
                                });
                            } else if (typeof content === 'object') {
                                try {
                                    content = JSON.stringify(content, null, 2);
                                } catch (error) {
                                    variables[varName] = '';
                                }
                            } else {
                                content = String(content);
                            }
                        }
                        
                        // Process line count if specified
                        if (lineCount !== undefined && content) {
                            const lines = content.split('\n');
                            if (lineCount > 0) {
                                // Get first N lines
                                content = lines.slice(0, lineCount).join('\n');
                            } else if (lineCount < 0) {
                                // Get last N lines
                                content = lines.slice(lineCount).join('\n');
                            }
                        }
                        
                        variables[varName] = content;
                    } catch (error) {
                        variables[varName] = '';
                    }
                }
                
                // Type 2: Read config content - format: varName=readconfig(param1,param2,param3,...)
                const readConfigMatch = trimmedLine.match(/^(\w+)\s*=\s*readconfig\((.*)\)$/);
                if (!matched && readConfigMatch) {
                    matched = true;
                    const varName = readConfigMatch[1];
                    const paramsString = readConfigMatch[2];
                    
                    // More robust parameter parsing to handle quotes and nested commas
                    const params = [];
                    let currentParam = '';
                    let inQuote = false;
                    let quoteType = '';
                    
                    for (let i = 0; i < paramsString.length; i++) {
                        const char = paramsString[i];
                        
                        if ((char === '"' || char === "'") && (i === 0 || paramsString[i-1] !== '\\')) {
                            if (!inQuote) {
                                inQuote = true;
                                quoteType = char;
                            } else if (char === quoteType) {
                                inQuote = false;
                            } else {
                                currentParam += char;
                            }
                        } else if (char === ',' && !inQuote) {
                            params.push(currentParam.trim());
                            currentParam = '';
                        } else {
                            currentParam += char;
                        }
                    }
                    
                    if (currentParam.trim()) {
                        params.push(currentParam.trim());
                    }
                    
                    // Process parameters and resolve variables using the expression evaluator
                    const resolvedParams = params.map(param => evaluateExpression(param, variables));
                    
                    // Get the nested value from config
                    let configValue = config;
                    
                    // More robust nested value retrieval
                    try {
                        for (const param of resolvedParams) {
                            if (configValue === undefined || configValue === null || typeof configValue !== 'object') {
                                configValue = null;
                                break;
                            }
                            
                            // Access by key explicitly
                            configValue = configValue[param];
                        }
                        
                        // Convert to string if it's an object or non-null
                        if (configValue !== null && configValue !== undefined) {
                            if (typeof configValue === 'object') {
                                try {
                                    variables[varName] = JSON.stringify(configValue, null, 2);
                                } catch (error) {
                                    variables[varName] = '';
                                }
                            } else {
                                variables[varName] = String(configValue);
                            }
                        } else {
                            variables[varName] = '';
                        }
                    } catch (error) {
                        variables[varName] = '';
                    }
                }
                
                // Type 3: Conditional statements - format: if(a==b){varName=value}
                const conditionalMatch = trimmedLine.match(/^if\s*\(\s*([^=<>!]+?)\s*([=<>!]=?)\s*([^)]+?)\s*\)\s*\{\s*(\w+)\s*=\s*([^}]+?)\s*\}$/);
                if (!matched && conditionalMatch) {
                    matched = true;
                    const leftOperand = conditionalMatch[1].trim();
                    const operator = conditionalMatch[2];
                    const rightOperand = conditionalMatch[3].trim();
                    const varName = conditionalMatch[4];
                    const value = conditionalMatch[5].trim();
                    
                    // Evaluate operands
                    const leftValue = evaluateExpression(leftOperand, variables);
                    const rightValue = evaluateExpression(rightOperand, variables);
                    
                    // For numeric comparisons, try to convert to numbers
                    let useNumericComparison = false;
                    let leftNumber, rightNumber;
                    
                    if (operator === '<' || operator === '>' || operator === '<=' || operator === '>=') {
                        leftNumber = parseFloat(leftValue);
                        rightNumber = parseFloat(rightValue);
                        
                        if (!isNaN(leftNumber) && !isNaN(rightNumber)) {
                            useNumericComparison = true;
                        } else {
                            // Skip this line if not convertible to numbers for < or > comparisons
                            continue;
                        }
                    }
                    
                    // Evaluate the condition
                    let condition = false;
                    if (useNumericComparison) {
                        switch (operator) {
                            case '<': condition = leftNumber < rightNumber; break;
                            case '>': condition = leftNumber > rightNumber; break;
                            case '<=': condition = leftNumber <= rightNumber; break;
                            case '>=': condition = leftNumber >= rightNumber; break;
                            default: condition = false;
                        }
                    } else {
                        switch (operator) {
                            case '==': condition = leftValue === rightValue; break;
                            case '!=': condition = leftValue !== rightValue; break;
                            default: condition = false;
                        }
                    }
                    
                    // If condition is true, set the variable
                    if (condition) {
                        // Evaluate the value expression
                        variables[varName] = evaluateExpression(value, variables);
                    }
                    else{
                      if (varName in variables){}
                      else{variables[varName]="";}
                    }
                }
            }
            
            return variables;
        }
        
        // Process both prompts
        const processedP1 = await processPromptWithVars(p1, p1_var);
        const processedP2 = await processPromptWithVars(p2, p2_var);
        
        return [processedP1, processedP2];
    } catch (error) {
        console.error('Error processing prompt:', error);
        return ['error', 'error'];
    }
}

export { processPrompt };