# 口袋旅行搭子 UI资源使用说明

## 1. 全局设计规范说明

- 设计基准宽度：`750`（小程序 `rpx` 适配基准）
- 主色：`#FF7D00`
- 辅助色：
  - 黄：`#FFE066`（浅 `#FFF9E6` / 深 `#E6B800`）
  - 绿：`#99D899`（浅 `#F0F9F0` / 深 `#3D993D`）
- 中性色：`#FFFFFF`、`#F5F5F5`、`#999999`、`#666666`、`#333333`
- 圆角：`8px/24px/64px/9999px`（已转换为 `16rpx/48rpx/128rpx/9999rpx`）
- 间距：`8px/16px/24px/32px/48px`（已转换为 `16rpx/32rpx/48rpx/64rpx/96rpx`）
- 字体：`PingFang SC`，标题 `600/700`，正文 `400`

对应代码文件：

- 全局变量：`src/styles/variables.scss`
- 全局样式入口：`src/styles/index.scss`
- 全局组件样式：`src/styles/components/*.scss`

## 2. 切图文件夹结构与使用场景

```
src/static/ui-assets/
├── global/
│   ├── icons/
│   │   ├── tab_explore_normal.svg
│   │   ├── tab_explore_active.svg
│   │   ├── tab_explore_disabled.svg
│   │   ├── tab_path_normal.svg
│   │   ├── tab_path_active.svg
│   │   ├── tab_path_disabled.svg
│   │   ├── tab_me_normal.svg
│   │   ├── tab_me_active.svg
│   │   └── tab_me_disabled.svg
│   └── components/
│       ├── btn_primary_normal.svg
│       ├── btn_primary_active.svg
│       └── btn_primary_disabled.svg
└── pages/
    ├── 01-loading/
    ├── 02-mood-qa/
    ├── 03-tag-setting/
    ├── 04-explore/
    ├── 05-recommend/
    ├── 06-path/
    ├── 07-path-basic-settings/
    ├── 08-path-advanced-settings/
    ├── 09-import-link/
    ├── 10-route-generate/
    ├── 11-spot-detail/
    ├── 12-comments-all/
    ├── 13-checkin-photo/
    ├── 14-spot-share-poster/
    ├── 15-me/
    ├── 16-bean-log/
    └── 17-message/
```

### 全局组件资源说明

- `tab_*`：底部 TabBar 图标三态（常态/选中/禁用）
- `btn_primary_*`：主按钮三态（常态/按下/禁用）

### 页面专属资源说明

- 每个页面建立独立目录，命名与 Stitch 页面序号一一对应
- 页面内专属图片统一建议输出为 `webp`，命名格式：`模块_语义_状态.webp`
- 建议尺寸策略：
  - 列表缩略图：宽 `320rpx` 级
  - 头图/海报图：宽 `686rpx` 级
  - 单图体积控制：`<=200KB`

## 3. SCSS 变量说明与使用方法

核心文件：`src/styles/variables.scss`

- 色彩变量：`$color-primary`、`$color-secondary-yellow`、`$color-secondary-green`、`$color-gray-*`
- 圆角变量：`$radius-sm`、`$radius-md`、`$radius-lg`、`$radius-pill`
- 间距变量：`$space-1` 到 `$space-5`
- 字体变量：`$font-size-*`、`$font-weight-*`
- 阴影变量：`$shadow-card`、`$shadow-soft`

使用示例：

```scss
@use '@/styles/variables.scss' as *;

.demo-card {
  padding: $space-2;
  border-radius: $radius-md;
  background: $color-white;
  box-shadow: $shadow-soft;
}
```

## 4. 页面样式文件清单（17页）

- `src/styles/pages/loading.scss`
- `src/styles/pages/mood-qa.scss`
- `src/styles/pages/tag-setting.scss`
- `src/styles/pages/explore.scss`
- `src/styles/pages/recommend.scss`
- `src/styles/pages/path.scss`
- `src/styles/pages/path-basic-settings.scss`
- `src/styles/pages/path-advanced-settings.scss`
- `src/styles/pages/import-link.scss`
- `src/styles/pages/route-generate.scss`
- `src/styles/pages/spot-detail.scss`
- `src/styles/pages/comments-all.scss`
- `src/styles/pages/checkin-photo.scss`
- `src/styles/pages/spot-share-poster.scss`
- `src/styles/pages/me.scss`
- `src/styles/pages/bean-log.scss`
- `src/styles/pages/message.scss`

## 5. 微信小程序适配注意事项

- 所有尺寸单位统一使用 `rpx`，不使用 `px`
- 页面容器采用 `flex` 布局，避免绝对定位导致机型错位
- 底部栏场景注意 `safe-area-inset-bottom`
- 图片资源优先 `webp`，图标优先 `svg`
- 提交前检查图片体积，单张不超过 `200KB`
