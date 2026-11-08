# @meditor/csvkit

零依赖 CSV 解析/序列化单一实现(RFC 4180)。

`@meditor/mtable` 与 `@meditor/jsonview` 的 CSV 能力均由本包提供:两包通过
薄封装固定各自历史行为预设(mtable:可配置分隔符 + 矩形补列 + 空白字段包裹;
jsonview:纯逗号 + 不补列),对外 API 保持不变。

## API

- `parseCsvMatrix(text, options?)` — 解析为二维矩阵(`delimiter` / `padColumns` / `emptyAsBlankRow`)
- `serializeCsvMatrix(matrix, options?)` — 序列化为 CSV(`delimiter` / `quoteWhitespace`)
- `looksLikeCsv(text)` — 粗判文本是否为 CSV
- `numberToAbc(index)` — 列号转字母(0→A, 26→AA)
