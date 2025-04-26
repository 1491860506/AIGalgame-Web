import{_ as v,r as w,c,o as l,a as s,b as y,n as h,t as p,F as m,f as g,g as k,d as S,p as _,K as C,e as b,L as I,m as x,I as D}from"./index-DyH5Twdd.js";const N={name:"StoryNode",props:{node:{type:Object,required:!0},depth:{type:Number,default:0}},data(){return{expanded:this.depth===0}},methods:{toggleExpand(){this.node.children.length>0&&(this.expanded=!this.expanded)}}},T={class:"node-content"},F={key:0,class:"node-actions"};function $(o,t,e,i,r,n){const d=w("story-node");return l(),c("li",{class:h(["tree-node",{"has-children":e.node.children.length>0,expanded:r.expanded}])},[s("div",T,[s("span",{class:h(["node-label",{"has-story":e.node.hasStory}]),onClick:t[0]||(t[0]=(...a)=>n.toggleExpand&&n.toggleExpand(...a))},p(e.node.label),3),e.node.hasStory?(l(),c("div",F,[s("button",{class:"view-btn",onClick:t[1]||(t[1]=a=>o.$emit("view",e.node))},t[3]||(t[3]=[s("i",{class:"fas fa-eye"},null,-1),s("span",null,"查看",-1)]))])):y("",!0)]),e.node.children.length>0?(l(),c("ul",{key:0,class:h(["nested",{active:r.expanded}])},[(l(!0),c(m,null,g(e.node.children,a=>(l(),k(d,{key:a.id,node:a,depth:e.depth+1,onView:t[2]||(t[2]=f=>o.$emit("view",f))},null,8,["node","depth"]))),128))],2)):y("",!0)],2)}const j=v(N,[["render",$],["__scopeId","data-v-8bb9ad00"]]),E={name:"ExportStory",components:{StoryNode:j},props:{storyTitle:{type:String,required:!0}},data(){return{isLoading:!0,isExporting:!1,exportingMessage:"",errorMessage:"",choiceData:{},storyContents:{},rootNode:null,selectedStory:null,currentPreviewFormat:"html",includePreviewContent:!1,storyIdChain:[],previewFormats:[{id:"text",name:"文本"},{id:"html",name:"HTML"},{id:"json",name:"JSON"}],exportFormats:[{id:"text",name:"导出文本",class:"text-btn",icon:"fas fa-file-alt"},{id:"html",name:"导出HTML",class:"html-btn",icon:"fas fa-file-code"},{id:"json",name:"导出JSON",class:"json-btn",icon:"fas fa-file-code"}],notification:{show:!1,message:"",type:"info",icon:"fas fa-info-circle",timer:null}}},computed:{formattedStoryText(){if(!this.selectedStory)return"";const o=this.getStoryConversations();return!o||!Array.isArray(o)?"无法加载故事内容":o.map(t=>{const e=t.character||"",i=t.text||"",r=t.place||"",n=e?`${e}：`:"旁白：",d=r?` [${r}]`:"";return`${n}${i}${d}`}).join(`
`)},formattedStoryHtml(){if(!this.selectedStory)return"";const o=this.getStoryConversations();if(!o||!Array.isArray(o))return'<p class="error">无法加载故事内容</p>';let t=null,e=null,i="";for(let r=0;r<o.length;r++){const n=o[r],d=n.character||"",a=n.text||"",f=n.place||"";if(f&&f!==t&&(t=f,i+=`
            <div class="story-place">
              <h3>${this.escapeHtml(f)}</h3>
              <div class="place-divider"></div>
            </div>
          `),!d){i+=`
            <div class="story-narration">
              <p class="narration-text">${this.formatDialogText(a)}</p>
            </div>
          `;continue}d!==e&&(e=d,i+=`
            <div class="character-section">
              <div class="character-name">${this.escapeHtml(d)}</div>
          `),i+=`
          <div class="dialog-bubble">
            ${this.formatDialogText(a)}
          </div>
        `;const u=r+1<o.length?o[r+1]:null;(!u||!u.character||u.character!==e)&&(i+="</div>",e=null)}return i=`
        <style>
          .story-preview-container {
            font-family: 'Noto Sans SC', 'PingFang SC', 'Microsoft YaHei', sans-serif;
            line-height: 1.6;
            max-width: 800px;
            margin: 0 auto;
            color: var(--text-primary, #1e293b);
            background-color: var(--content-bg, #ffffff);
            padding: 20px;
            border-radius: 8px;
          }
          
          .story-place {
            margin: 25px 0 15px;
          }
          
          .story-place h3 {
            margin: 0 0 8px 0;
            font-size: 22px;
            font-weight: 600;
            color: var(--primary-color, #4361ee);
          }
          
          .place-divider {
            height: 2px;
            background: linear-gradient(to right, var(--primary-color, #4361ee), transparent);
            margin-bottom: 15px;
          }
          
          .story-narration {
            margin-bottom: 20px;
            padding-left: 15px;
          }
          
          .narration-text {
            font-style: italic;
            color: var(--text-secondary, #64748b);
            line-height: 1.7;
            background-color: var(--hover-bg, rgba(241, 245, 249, 0.5));
            padding: 12px 18px;
            border-left: 4px solid var(--border-color, #94a3b8);
            margin: 0;
          }
          
          .character-section {
            margin-bottom: 20px;
          }
          
          .character-name {
            font-weight: bold;
            color: var(--primary-color, #4361ee);
            font-size: 17px;
            margin-bottom: 8px;
          }
          
          .dialog-bubble {
            background-color: var(--hover-bg, #f1f5f9);
            padding: 12px 16px;
            border-radius: 12px;
            margin: 5px 0 10px 15px;
            position: relative;
            max-width: 90%;
            box-shadow: 0 1px 2px rgba(0,0,0,0.05);
          }
          
          .dialog-bubble:before {
            content: '';
            position: absolute;
            top: 15px;
            left: -8px;
            width: 0;
            height: 0;
            border-style: solid;
            border-width: 8px 10px 8px 0;
            border-color: transparent var(--hover-bg, #f1f5f9) transparent transparent;
          }
          
          /* Dark mode support */
          @media (prefers-color-scheme: dark) {
            .story-preview-container {
              color: #f1f5f9;
              background-color: #1e293b;
            }
            
            .dialog-bubble {
              background-color: #334155;
            }
            
            .dialog-bubble:before {
              border-color: transparent #334155 transparent transparent;
            }
            
            .narration-text {
              background-color: rgba(30, 41, 59, 0.5);
              border-left-color: #475569;
              color: #cbd5e1;
            }
            
            .character-name {
              color: #818cf8;
            }
            
            .story-place h3 {
              color: #818cf8;
            }
            
            .place-divider {
              background: linear-gradient(to right, #818cf8, transparent);
            }
          }
          
          /* For app.vue dark-theme class */
          .dark-theme .story-preview-container {
            color: #f1f5f9;
            background-color: #1e293b;
          }
          
          .dark-theme .dialog-bubble {
            background-color: #334155;
          }
          
          .dark-theme .dialog-bubble:before {
            border-color: transparent #334155 transparent transparent;
          }
          
          .dark-theme .narration-text {
            background-color: rgba(30, 41, 59, 0.5);
            border-left-color: #475569;
            color: #cbd5e1;
          }
          
          .dark-theme .character-name {
            color: #818cf8;
          }
          
          .dark-theme .story-place h3 {
            color: #818cf8;
          }
          
          .dark-theme .place-divider {
            background: linear-gradient(to right, #818cf8, transparent);
          }
        </style>
        <div class="story-preview-container">
          ${i}
        </div>
      `,i},formattedStoryJson(){if(!this.selectedStory)return"";const o=this.getStoryConversations();if(!o)return"Error: Unable to load story conversations.";const t={conversations:o.map(e=>{const{id:i,...r}=e;return r})};return JSON.stringify(t,null,2)},currentUser(){return new Date().toLocaleString()},currentTimestamp(){return new Date().toLocaleString()}},async mounted(){try{await this.loadStoryData(),this.buildTreeStructure(),this.isLoading=!1}catch(o){console.error("Failed to load story data:",o),this.errorMessage="加载故事数据失败: "+o.message,this.isLoading=!1}},methods:{async loadStoryData(){if(!this.storyTitle)throw new Error("故事标题未从父组件传递");const o=`/data/${this.storyTitle}/choice.json`;try{this.choiceData=await x(o)||{}}catch(e){console.warn(`未找到或无法读取选择文件: ${o}`,e),this.choiceData={}}const t=`/data/${this.storyTitle}/story`;try{const e=await D(t);console.log("Story files found:",e),await Promise.all(e.filter(i=>!i.isDirectory&&i.name.endsWith(".json")).map(async i=>{const r=i.name.replace(".json","");try{const n=await x(`${t}/${i.name}`);this.storyContents[r]=n}catch(n){console.warn(`无法加载故事内容 ID ${r}:`,n)}}))}catch(e){e.message&&e.message.includes("目录不存在")?console.warn(`故事内容目录不存在: ${t}`):console.error(`无法列出故事内容目录: ${t}`,e)}},buildTreeStructure(){var t;this.rootNode={id:"0",label:"开始 (ID: 0)",parentId:null,children:[],hasStory:this.storyContents.hasOwnProperty("0")};const o={0:this.rootNode};for(const[e,i]of Object.entries(this.choiceData))if(Array.isArray(i))for(const r of i){if(!r||!r.id)continue;const n=r.id,d=((t=Object.entries(r).find(([a])=>a.startsWith("choice")))==null?void 0:t[1])||"未知选项";o[n]?(o[n].parentId===null&&e!==null?o[n].parentId=e:o[n].parentId!==e&&console.warn(`Node ${n} has multiple parents: ${o[n].parentId} and ${e}. Using the first one found.`),o[n].hasStory=this.storyContents.hasOwnProperty(n)):o[n]={id:n,label:`${d} (ID: ${n})`,parentId:e,children:[],hasStory:this.storyContents.hasOwnProperty(n)}}for(const[e,i]of Object.entries(this.choiceData)){const r=o[e];if(!(!r||!Array.isArray(i)))for(const n of i){if(!n||!n.id)continue;const d=o[n.id];d&&!r.children.some(a=>a.id===d.id)&&r.children.push(d)}}Object.values(o).forEach(e=>{e.id!=="0"&&e.parentId===null?console.warn(`Node ${e.id} (${e.label}) appears to be an orphan node (no parent found in choice data).`):e.parentId!==null&&!o[e.parentId]&&console.warn(`Node ${e.id} has parentId ${e.parentId}, but the parent node was not found.`)})},async viewStory(o){if(!o.hasStory){this.showNotification("该节点没有故事内容","warning");return}const t=o.id;try{const e=this.storyContents[t];if(!e)throw new Error(`未找到ID为 ${t} 的故事内容`);this.selectedStory={id:t,content:e};const i=`${this.storyTitle}`;this.storyIdChain=await I(t,i)}catch(e){console.error(`查看故事失败 (ID: ${t}):`,e),this.showNotification(`查看故事失败: ${e.message}`,"error")}},prepareExport(o){this.viewStory(o)},async exportStory(o){if(this.selectedStory){this.isExporting=!0,this.exportingMessage=`正在导出 ${o.toUpperCase()} 格式...`;try{const t=`story_${this.selectedStory.id}_${o}`;let e,i;switch(o){case"text":e=this.formattedStoryText,i="text/plain",this.downloadFile(`${t}.txt`,e,i);break;case"json":e=this.formattedStoryJson,i="application/json",this.downloadFile(`${t}.json`,e,i);break;case"html":e=this.generateHtmlDocument(),i="text/html",this.downloadFile(`${t}.html`,e,i);break}this.showNotification(`成功导出为 ${o.toUpperCase()} 格式`,"success")}catch(t){console.error("导出故事失败:",t),this.showNotification(`导出失败: ${t.message}`,"error")}finally{this.isExporting=!1}}},generateHtmlDocument(){const o=`故事: ${this.storyTitle} (ID: ${this.selectedStory.id})`,t=this.formattedStoryHtml;return`<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${o}</title>
  <style>
    :root {
      --text-primary: #333;
      --text-secondary: #7f8c8d;
      --content-bg: #fff;
      --primary-color: #3498db;
      --border-color: #eee;
      --hover-bg: #f8f9fa;
      --dialog-bg: #f8f9fa;
      --narration-bg: #f0f2f5;
      --narration-border: #95a5a6;
    }
    
    @media (prefers-color-scheme: dark) {
      :root {
        --text-primary: #f1f5f9;
        --text-secondary: #cbd5e1;
        --content-bg: #1e293b;
        --primary-color: #818cf8;
        --border-color: #334155;
        --hover-bg: #334155;
        --dialog-bg: #334155;
        --narration-bg: rgba(30, 41, 59, 0.5);
        --narration-border: #475569;
      }
    }
    
    body {
      font-family: 'Noto Sans SC', 'PingFang SC', 'Microsoft YaHei', sans-serif;
      line-height: 1.6;
      color: var(--text-primary);
      background-color: #f5f5f5;
      max-width: 800px;
      margin: 0 auto;
      padding: 20px;
    }
    
    @media (prefers-color-scheme: dark) {
      body {
        background-color: #0f172a;
      }
    }
    
    .story-container {
      background-color: var(--content-bg);
      padding: 30px;
      border-radius: 10px;
      box-shadow: 0 2px 10px rgba(0, 0, 0, 0.1);
    }
    
    header {
      margin-bottom: 30px;
      text-align: center;
      padding-bottom: 20px;
      border-bottom: 1px solid var(--border-color);
    }
    
    h1 {
      font-size: 24px;
      margin-bottom: 10px;
      color: var(--primary-color);
    }
    
    .story-meta {
      color: var(--text-secondary);
      font-size: 14px;
    }
    
    .story-place {
      margin: 25px 0 15px;
      border-bottom: 1px solid var(--border-color);
      padding-bottom: 5px;
    }
    
    .story-place h3 {
      margin: 0;
      color: var(--primary-color);
      font-size: 20px;
      font-weight: 500;
    }
    
    .story-dialog {
      margin-bottom: 15px;
      line-height: 1.7;
    }
    
    .character {
      color: var(--primary-color);
      font-weight: bold;
      margin-bottom: 5px;
    }
    
    .dialog-text {
      margin-left: 16px;
      background-color: var(--dialog-bg);
      padding: 10px 15px;
      border-radius: 8px;
      position: relative;
    }
    
    .dialog-text:before {
      content: '';
      position: absolute;
      left: -8px;
      top: 15px;
      border-style: solid;
      border-width: 8px 8px 8px 0;
      border-color: transparent var(--dialog-bg) transparent transparent;
    }
    
    .story-narration {
      margin-bottom: 20px;
      font-style: italic;
    }
    
    .narration-text {
      background-color: var(--narration-bg);
      padding: 12px 18px;
      border-left: 4px solid var(--narration-border);
      color: var(--text-secondary);
      line-height: 1.8;
    }
    
    footer {
      margin-top: 30px;
      text-align: center;
      font-size: 13px;
      color: var(--text-secondary);
    }
  </style>
</head>
<body>
  <div class="story-container">
    <header>
      <h1>${o}</h1>
      <div class="story-meta">
        <span>故事ID: ${this.selectedStory.id}</span>
        ${this.storyIdChain.length>1?`<span> | 路径: ${this.storyIdChain.join(" → ")}</span>`:""}
        <span> | 导出时间: ${this.currentTimestamp}</span>
      </div>
    </header>
    
    <div class="story-content">
      ${t}
    </div>
    
    <footer>
      <p>由 AI Galgame Studio 生成 | ${this.currentUser}</p>
    </footer>
  </div>
</body>
</html>`},downloadFile(o,t,e="text/plain"){const i=new Blob([t],{type:e}),r=URL.createObjectURL(i),n=document.createElement("a");n.href=r,n.download=o,document.body.appendChild(n),n.click(),document.body.removeChild(n),URL.revokeObjectURL(r)},getStoryConversations(){var o;if(!this.selectedStory)return null;if(this.includePreviewContent&&this.storyIdChain.length>1){const t=[];for(const e of this.storyIdChain){const i=this.storyContents[e];i&&i.conversations&&t.push(...i.conversations)}return t}else return((o=this.selectedStory.content)==null?void 0:o.conversations)||[]},escapeHtml(o){const t=document.createElement("div");return t.textContent=o,t.innerHTML},formatDialogText(o){return this.escapeHtml(o).replace(/\n/g,"<br>")},showNotification(o,t="success"){this.notification.timer&&clearTimeout(this.notification.timer);let e;switch(t){case"success":e="fas fa-check-circle";break;case"error":e="fas fa-exclamation-circle";break;case"warning":e="fas fa-exclamation-triangle";break;default:e="fas fa-info-circle"}this.notification={show:!0,message:o,type:t,icon:e,timer:setTimeout(()=>{this.notification.show=!1},3e3)}}}},P={class:"export-story"},L={class:"content-wrapper"},H={class:"choice-tree-section"},M={class:"tree-container"},O={key:0,class:"loading-indicator"},U={key:1,class:"error-message"},A={key:2},z={class:"tree"},V={class:"preview-header"},J={class:"format-controls"},B=["onClick"],R={class:"preview-body"},Y={key:0,class:"no-selection"},q={key:1},W={class:"story-meta"},G={class:"story-id"},K={key:0,class:"story-path"},Q={key:0,class:"preview-text"},X={key:1,class:"preview-html"},Z=["innerHTML"],tt={key:2,class:"preview-json"},et={key:0,class:"preview-footer"},ot={class:"export-options"},rt={class:"include-previous-toggle"},nt={class:"toggle-switch"},st={class:"export-buttons"},it=["onClick"],at={key:1,class:"loading-overlay"},lt={class:"loading-content"};function ct(o,t,e,i,r,n){const d=w("story-node");return l(),c("div",P,[s("main",null,[s("div",L,[s("section",H,[t[4]||(t[4]=s("h2",null,"故事选择树",-1)),s("div",M,[r.isLoading?(l(),c("div",O,t[2]||(t[2]=[s("div",{class:"spinner"},null,-1),s("p",null,"正在加载故事结构...",-1)]))):r.errorMessage?(l(),c("div",U,[t[3]||(t[3]=s("i",{class:"fas fa-exclamation-circle"},null,-1)),s("p",null,p(r.errorMessage),1)])):(l(),c("div",A,[s("ul",z,[S(d,{node:r.rootNode,depth:0,onView:n.viewStory,onExport:n.prepareExport},null,8,["node","onView","onExport"])])]))])]),s("section",{class:h(["preview-section",{active:r.selectedStory}])},[s("div",V,[t[6]||(t[6]=s("h2",null,"故事预览",-1)),s("div",J,[(l(!0),c(m,null,g(r.previewFormats,a=>(l(),c("button",{key:a.id,class:h(["format-btn",{active:r.currentPreviewFormat===a.id}]),onClick:f=>r.currentPreviewFormat=a.id},p(a.name),11,B))),128))]),s("button",{class:"close-btn",onClick:t[0]||(t[0]=a=>r.selectedStory=null),"aria-label":"Close preview"},t[5]||(t[5]=[s("i",{class:"fas fa-times"},null,-1)]))]),s("div",R,[r.selectedStory?(l(),c("div",q,[s("div",W,[s("span",G,"ID: "+p(r.selectedStory.id),1),r.storyIdChain.length>1?(l(),c("span",K," 路径: "+p(r.storyIdChain.join(" → ")),1)):y("",!0)]),r.currentPreviewFormat==="text"?(l(),c("div",Q,[s("pre",null,p(n.formattedStoryText),1)])):r.currentPreviewFormat==="html"?(l(),c("div",X,[s("div",{class:"html-story",innerHTML:n.formattedStoryHtml},null,8,Z)])):r.currentPreviewFormat==="json"?(l(),c("div",tt,[s("pre",null,p(n.formattedStoryJson),1)])):y("",!0)])):(l(),c("div",Y,t[7]||(t[7]=[s("i",{class:"fas fa-book-open"},null,-1),s("p",null,"请从故事树中选择一个节点预览",-1)])))]),r.selectedStory?(l(),c("div",et,[s("div",ot,[s("div",rt,[s("label",nt,[_(s("input",{type:"checkbox","onUpdate:modelValue":t[1]||(t[1]=a=>r.includePreviewContent=a)},null,512),[[C,r.includePreviewContent]]),t[8]||(t[8]=s("span",{class:"toggle-slider"},null,-1))]),t[9]||(t[9]=s("span",{class:"toggle-label1"},"包含上文内容",-1))]),s("div",st,[(l(!0),c(m,null,g(r.exportFormats,a=>(l(),c("button",{key:a.id,class:h(["export-btn",a.class]),onClick:f=>n.exportStory(a.id)},[s("i",{class:h(a.icon)},null,2),b(" "+p(a.name),1)],10,it))),128))])])])):y("",!0)],2)])]),r.notification.show?(l(),c("div",{key:0,class:h(["notification",r.notification.type])},[s("i",{class:h(r.notification.icon)},null,2),b(" "+p(r.notification.message),1)],2)):y("",!0),r.isExporting?(l(),c("div",at,[s("div",lt,[t[10]||(t[10]=s("div",{class:"spinner"},null,-1)),s("p",null,p(r.exportingMessage),1)])])):y("",!0)])}const pt=v(E,[["render",ct],["__scopeId","data-v-6e787919"]]);export{pt as default};
