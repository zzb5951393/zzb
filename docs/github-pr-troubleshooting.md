# GitHub PR 冲突处理说明

如果 GitHub 在 PR 页面显示：

```text
This branch has conflicts that must be resolved
```

说明当前 PR 分支和目标分支修改了同一批文件，GitHub 无法自动判断应该保留哪一版。

## 推荐做法

对这个贪吃蛇原型项目，最省事的做法是：

1. 不要在 GitHub 网页编辑器里手动解决这批冲突。
2. 关闭旧的冲突 PR。
3. 使用最新重新创建的干净 PR。
4. 如果只是想试玩，不需要先合并 PR：可以直接下载最新 PR 的 ZIP，解压后双击 `index.html`。

## 为什么不建议手动 Resolve conflicts

这批冲突文件包含游戏核心文件：

- `index.html`
- `src/main.js`
- `src/game/config.js`
- `src/game/state.js`
- `src/game/input.js`
- `src/game/renderer.js`
- `README.md`

这些文件之间有加载顺序和全局模块依赖。手动处理冲突时如果漏删了冲突标记，或者混用了旧版 `type="module"` 写法和新版普通脚本写法，游戏就可能出现按钮无反应的问题。当前干净版本不包含 png/jpg/mp3 等资源文件，蛇、食物和背景都用 HTML/CSS/Canvas 代码绘制。

## 如何确认你下载的是正确版本

解压 ZIP 后，打开 `index.html` 文件，底部应该能看到这些脚本：

```html
<script src="./src/game/config.js"></script>
<script src="./src/game/state.js"></script>
<script src="./src/game/input.js"></script>
<script src="./src/game/renderer.js"></script>
<script src="./src/main.js"></script>
```

如果你看到的是下面这种写法：

```html
<script type="module" src="./src/main.js"></script>
```

说明你下载的是旧版本。旧版本直接双击 `index.html` 时，部分浏览器会阻止模块脚本加载，表现为开始按钮没有反应。
