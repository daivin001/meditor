# @meditor/jsonview

数据库视图块组件包(零运行时依赖):`jsondata-view` 围栏数据格式 + 七种视图渲染(表格/看板/画廊/列表/日历/甘特图/文本)。

数据格式约定:围栏内只存业务数据(字段 + 记录);视图种类由块标签(```jsondata-view:table 等)承载,筛选/排序等会话状态不持久化。

## 用法

```ts
import { createJsonview } from '@meditor/jsonview';
import '@meditor/jsonview/style.css';

const api = createJsonview({
  root: host,
  doc: '``` 围栏内的 JSON 文本 ```',
  viewKind: 'table',            // 初始视图(缺省 table;宿主从块标签解析传入)
  locale: 'zh-CN',
  onChange: (canonicalJson) => console.log(canonicalJson),
  onChangeViewKind: (kind) => console.log(kind)  // 用户切换视图 Tab 时回调
});

api.setDoc(json);        // 外部回填
api.getDoc();            // canonical JSON
api.setViewKind(kind);   // 切换视图(宿主写回;不触发 onChangeViewKind)
api.getViewKind();       // 当前视图种类
api.destroy();
```

## 数据格式(```jsondata-view:<kind> 围栏体)

```json
{
  "version": 1,
  "name": "任务追踪",
  "fields": [
    { "id": "f1", "name": "标题", "type": "text" },
    { "id": "f2", "name": "状态", "type": "select", "options": ["待办", "进行中", "完成"] }
  ],
  "records": [{ "id": "r1", "cells": { "f1": "写方案", "f2": "待办" } }]
}
```

围栏标签 `jsondata-view:<kind>` 的 `kind` 决定默认展示视图,共 7 种:
`table`(表格)/ `kanban`(看板)/ `gallery`(画廊)/ `list`(列表)/ `calendar`(日历)/ `gantt`(甘特图)/ `text`(文本)。
兼容消化:旧 `meditor-db` 围栏按 `table` 解析,序列化自动迁移为新标签。

字段类型:`text / number / select / multiSelect / checkbox / date / url`。
容错:坏 JSON / 未知 version 降级为只读提示;孤值(未知 fieldId)与类型不符取值清洗丢弃。
甘特图需要两个 date 字段(开始/结束,结束缺失时按当天绘制);看板需要 select/multiSelect 分组字段;日历需要 date 字段;画廊需要 url 图片字段。

## 构建

```bash
npm run build    # tsc dist-types + vite 产出 dist/jsonview.js / jsonview.css
npm run typecheck
```
