
## 函数解释

### readFile

```typescript
async function readFile(path: string, forceRefresh?: boolean, retryCount?: number): Promise<any>
```

**功能：**

从 IndexedDB 文件系统中读取指定路径的文件内容。

**调用方式：**

```typescript
readFile(path: string, forceRefresh?: boolean, retryCount?: number): Promise<any>
```

**参数：**

*   `path`: `string` - 文件路径，格式为 `/data/{title}/path/to/file`。
*   `forceRefresh`: `boolean` (可选) - 是否强制刷新数据库版本号，默认为 `false`。
*   `retryCount`: `number` (可选) - 当前重试次数，默认为 `0`。

**返回值：**

`Promise<any>` -  一个 Promise，resolve时返回文件内容。如果文件不存在，Promise reject。

**异常：**

*   如果路径是文件夹，抛出错误，提示使用 `listDirectory` 函数。
*   如果文件不存在，Promise reject。
*   如果数据库操作失败，Promise reject。

---

### writeFile

```typescript
async function writeFile(path: string, data: any, forceRefresh?: boolean, retryCount?: number): Promise<void>
```

**功能：**

将数据写入 IndexedDB 文件系统中指定路径的文件。

**调用方式：**

```typescript
writeFile(path: string, data: any, forceRefresh?: boolean, retryCount?: number): Promise<void>
```

**参数：**

*   `path`: `string` - 文件路径，格式为 `/data/{title}/path/to/file`。
*   `data`: `any` - 要写入的文件内容。
*   `forceRefresh`: `boolean` (可选) - 是否强制刷新数据库版本号，默认为 `false`。
*   `retryCount`: `number` (可选) - 当前重试次数，默认为 `0`。

**返回值：**

`Promise<void>` - 一个 Promise，resolve时表示写入成功。

**异常：**

*   如果路径是文件夹，抛出错误。
*   如果数据库操作失败，Promise reject。

---

### deletePath

```typescript
async function deletePath(path: string, forceRefresh?: boolean, retryCount?: number): Promise<void>
```

**功能：**

从 IndexedDB 文件系统中删除指定路径的文件或文件夹。

**调用方式：**

```typescript
deletePath(path: string, forceRefresh?: boolean, retryCount?: number): Promise<void>
```

**参数：**

*   `path`: `string` - 文件或文件夹路径，格式为 `/data/{title}/path/to/file_or_folder`。
*   `forceRefresh`: `boolean` (可选) - 是否强制刷新数据库版本号，默认为 `false`。
*   `retryCount`: `number` (可选) - 当前重试次数，默认为 `0`。

**返回值：**

`Promise<void>` - 一个 Promise，resolve时表示删除成功。

**异常：**

*   如果路径是根目录 `/data`，抛出错误。
*   如果数据库操作失败，Promise reject。

---

### renamePath

```typescript
async function renamePath(oldPath: string, newName: string, forceRefresh?: boolean, retryCount?: number): Promise<void>
```

**功能：**

在 IndexedDB 文件系统中重命名指定路径的文件或文件夹。

**调用方式：**

```typescript
renamePath(oldPath: string, newName: string, forceRefresh?: boolean, retryCount?: number): Promise<void>
```

**参数：**

*   `oldPath`: `string` - 旧路径，格式为 `/data/{title}/path/to/file_or_folder`。
*   `newName`: `string` - 新名称（不是完整路径，只是名称）。
*   `forceRefresh`: `boolean` (可选) - 是否强制刷新数据库版本号，默认为 `false`。
*   `retryCount`: `number` (可选) - 当前重试次数，默认为 `0`。

**返回值：**

`Promise<void>` - 一个 Promise，resolve时表示重命名成功。

**异常：**

*   如果旧路径是根目录 `/data`，抛出错误。
*   如果新名称包含斜杠 `/`，抛出错误。
*   如果数据库操作失败，Promise reject。

---

### listDirectory

```typescript
async function listDirectory(path: string, forceRefresh?: boolean, retryCount?: number): Promise<Array<{name: string, isFolder: boolean, path: string}>>
```

**功能：**

列出 IndexedDB 文件系统中指定目录下所有文件和文件夹的信息。

**调用方式：**

```typescript
listDirectory(path: string, forceRefresh?: boolean, retryCount?: number): Promise<Array<{name: string, isFolder: boolean, path: string}>>
```

**参数：**

*   `path`: `string` - 目录路径，格式为 `/data/{title}/path/to/folder`。
*   `forceRefresh`: `boolean` (可选) - 是否强制刷新数据库版本号，默认为 `false`。
*   `retryCount`: `number` (可选) - 当前重试次数，默认为 `0`。

**返回值：**

`Promise<Array<{name: string, isFolder: boolean, path: string}>>` - 一个 Promise，resolve时返回文件和文件夹信息列表。列表中的每个元素都是一个对象，包含以下属性：

*   `name`: `string` - 文件或文件夹的名称。
*   `isFolder`: `boolean` - 是否为文件夹。
*   `path`: `string` - 文件或文件夹的完整路径。
*   `size`: `number` - 文件的大小，文件夹为0。

**异常：**

*   如果目录不存在，Promise reject。
*   如果数据库操作失败，Promise reject。

---

### getMetadata

```typescript
async function getMetadata(path: string, forceRefresh?: boolean, retryCount?: number): Promise<{exists: boolean, isFolder: boolean, size?: number, lastModified?: number}>
```

**功能：**

获取 IndexedDB 文件系统中指定路径的文件或文件夹的元信息。

**调用方式：**

```typescript
getMetadata(path: string, forceRefresh?: boolean, retryCount?: number): Promise<{exists: boolean, isFolder: boolean, size?: number, lastModified?: number}>
```

**参数：**

*   `path`: `string` - 文件或文件夹路径，格式为 `/data/{title}/path/to/file_or_folder`。
*   `forceRefresh`: `boolean` (可选) - 是否强制刷新数据库版本号，默认为 `false`。
*   `retryCount`: `number` (可选) - 当前重试次数，默认为 `0`。

**返回值：**

`Promise<{exists: boolean, isFolder: boolean, size?: number, lastModified?: number}>` -  一个 Promise，resolve时返回元信息对象，包含以下属性：

*   `exists`: `boolean` - 文件或文件夹是否存在。
*   `isFolder`: `boolean` - 是否为文件夹。
*   `size`: `number` (可选) - 文件大小（仅文件有此属性）。
*   `lastModified`: `number` (可选) - 最后修改时间的时间戳（仅文件有此属性）。

**异常：**

*   如果数据库操作失败，Promise reject。

---

### getAllTitles

```typescript
async function getAllTitles(forceRefresh?: boolean, retryCount?: number): Promise<string[]>
```

**功能：**

获取 IndexedDB 文件系统中所有可用的标题（存储名）。

**调用方式：**

```typescript
getAllTitles(forceRefresh?: boolean, retryCount?: number): Promise<string[]>
```

**参数：**

*   `forceRefresh`: `boolean` (可选) - 是否强制刷新数据库版本号，默认为 `false`。
*   `retryCount`: `number` (可选) - 当前重试次数，默认为 `0`。

**返回值：**

`Promise<string[]>` - 一个 Promise，resolve时返回标题列表。

**异常：**

*   如果数据库操作失败，Promise reject。

---

### createFolder

```typescript
async function createFolder(path: string, forceRefresh?: boolean, retryCount?: number): Promise<void>
```

**功能：**

在 IndexedDB 文件系统中创建指定路径的文件夹。

**调用方式：**

```typescript
createFolder(path: string, forceRefresh?: boolean, retryCount?: number): Promise<void>
```

**参数：**

*   `path`: `string` - 文件夹路径，格式为 `/data/{title}/path/to/folder`。
*   `forceRefresh`: `boolean` (可选) - 是否强制刷新数据库版本号，默认为 `false`。
*   `retryCount`: `number` (可选) - 当前重试次数，默认为 `0`。

**返回值：**

`Promise<void>` - 一个 Promise，resolve时表示创建成功。

**异常：**

*   如果路径是根目录，抛出错误。
*   如果数据库操作失败，Promise reject。

---

### getAllData

```typescript
async function getAllData(title: string, forceRefresh?: boolean, retryCount?: number): Promise<Object>
```

**功能：**

获取 IndexedDB 文件系统中指定标题（存储名）下的所有数据。

**调用方式：**

```typescript
getAllData(title: string, forceRefresh?: boolean, retryCount?: number): Promise<Object>
```

**参数：**

*   `title`: `string` - 标题/存储名。
*   `forceRefresh`: `boolean` (可选) - 是否强制刷新数据库版本号，默认为 `false`。
*   `retryCount`: `number` (可选) - 当前重试次数，默认为 `0`。

**返回值：**

`Promise<Object>` - 一个 Promise，resolve时返回包含所有键值对的对象。键是字符串类型的key，值是any类型。

**异常：**

*   如果数据库操作失败，Promise reject。
```