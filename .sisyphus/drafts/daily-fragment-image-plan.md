# Draft: 每日碎片图像生成功能

## 项目现状分析

### 现有技术栈
- **前端**: React 18 + TypeScript + Vite + Tailwind CSS
- **状态管理**: Zustand（本地持久化 + Supabase 同步）
- **AI 集成**: Qwen（通义千问）API
- **后端**: Supabase（PostgreSQL + Auth）
- **UI 组件**: Headless UI + Framer Motion + Lucide React

### 现有核心功能
1. **Chat/Record 模式**
   - Chat: 与 AI 小王子"Time Shine"对话
   - Record: 记录日常活动，自动计算持续时间
   - 支持心情记录（isMood: true）
   
2. **数据结构**（useChatStore）
   ```typescript
   interface Message {
     id: string;
     content: string;        // 活动内容
     timestamp: number;      // 开始时间
     duration?: number;      // 持续时间（分钟）
     activityType?: string;  // AI 分类类型
     mode: 'chat' | 'record';
     isMood?: boolean;       // 是否为心情记录
   }
   ```

3. **Todo 管理**（useTodoStore）
   - 艾森豪威尔矩阵（紧急/重要四象限）
   - 每日/每周/每月视图
   - 与记录模式联动

4. **时间报告**（ReportPage）
   - 日历视图
   - 完成情况统计
   - AI 分析（占位符）

### 关键发现
- 数据已存储在 Supabase，用户可登录后同步
- 已有 AI 集成（Qwen），人设是"外星小王子"
- 活动记录带时间戳和持续时间，可用于生成每日摘要
- 已有心情记录功能，可作为情感维度数据

---

## 技术调研结果汇总

### 1. 数据模型分析（来自后台调研）

**Message（活动记录）可用字段：**
- `content`: 活动内容描述
- `timestamp`: 开始时间戳
- `duration`: 持续时长（分钟）
- `activityType`: AI 分类类型（当前只有 'mood' 或 '待分类'）
- `isMood`: 是否为心情记录
- `mode`: 'chat' | 'record'

**Todo（待办）可用字段：**
- `content`: 任务描述
- `priority`: 紧急/重要四象限
- `category`: 分类（学习/工作/社交/生活/娱乐）
- `duration`: 实际完成时长
- `completed`: 完成状态
- `completedAt`: 完成时间戳
- `recurrence`: 重复模式

**当前 AI 能力：**
- Qwen API（通义千问）已集成
- 人设：外星小王子 "Time Shine"
- 当前用途：对话、批注、报告分析
- **可扩展**：用于生成碎片元数据（颜色、形状、情感）

**当前图像基础设施：**
- ❌ 无图像上传功能
- ❌ 无 Canvas/SVG 代码
- ✅ 使用 Tailwind + Framer Motion 做动画

### 2. UI 架构分析

**添加新页面流程：**
1. `BottomNav.tsx` 添加导航项（使用 NavLink + Lucide 图标）
2. `App.tsx` 添加 Route
3. 创建 `src/features/gallery/GalleryPage.tsx`

**推荐样式模式：**
- 卡片：`bg-white rounded-xl shadow-sm border border-gray-100`
- 玻璃效果：`backdrop-blur-lg bg-white/70`
- 渐变：`bg-gradient-to-br from-purple-400 to-blue-500`
- 动画：Framer Motion

### 3. 图像生成技术方案（推荐）

**推荐方案：客户端 Canvas + D3 Voronoi + 分层合成**

| 层级 | 技术 | 用途 |
|------|------|------|
| **日碎片** | Canvas + d3-voronoi | 生成教堂彩窗风格的 Voronoi 镶嵌图案 |
| **日缓存** | PNG (800x800) | 本地缓存 + Supabase Storage |
| **周/月/年** | Canvas drawImage() | 将日图作为纹理合成大图 |
| **导出** | html-to-image | 分享图片生成 |

**碎片视觉效果：**
- **形状**：Voronoi 镶嵌（自然有机的碎片形状）
- **颜色**：根据 `category` + `hourOfDay` + AI 情感分析
- **大小**：根据 `duration`（大碎片 = 长时间活动）
- **边框**：模拟教堂彩窗的"铅条"效果
- **光泽**：径向渐变模拟玻璃反光

**存储策略：**
- 碎片元数据：存储在 Supabase（可复现生成）
- 生成的 PNG：Supabase Storage + Smart CDN
- 本地缓存：IndexedDB + LRU

---

## 新功能需求（待澄清）

### 核心概念澄清清单

**1. 碎片来源**
- [ ] Todo（待办）还是 Record（活动记录）还是两者都生成？
- [ ] 如果两者都生成，如何区分/融合？

**2. 碎片属性**
- [ ] 形状：随机？还是根据事项类型决定？
- [ ] 大小：根据持续时间？重要性？
- [ ] 颜色：AI 决定？还是固定映射（如工作=蓝色）？

**3. AI 生成流程**
- [ ] AI 输入：活动/待办的内容、时长、心情、类型
- [ ] AI 输出：仅颜色和形状参数？描述性文字？还是 SVG 路径？

**4. 每日整体图案**
- [ ] 图案决定逻辑：AI 生成主题描述 → 渲染引擎组合？
- [ ] 还是直接使用 DALL-E 生成完整图像？
- [ ] 还是预定义模板（猫、眼睛、树等）AI 只选择？

**5. 周期性组合**
- [ ] 每周图像是把7张日图缩小拼在一起？还是提取碎片重新组合？
- [ ] 如果重新组合，碎片数量增加（7天×N个），如何布局？
- [ ] 用户如何切换查看日/周/月/年视图？

**6. 交互与社交**
- [ ] 点击碎片显示：事项内容、时间、心情，还有其他吗？
- [ ] 收藏空间隐喻：画册 / 时空长廊 / 收藏室？
- [ ] 导出分享：PNG 图片还是分享链接？
- [ ] 碎片交换：交换单个碎片还是整天的彩窗？匹配规则是什么？

**7. 实现优先级**
- [ ] 是否分阶段：Phase 1 基础日碎片 → Phase 2 周月年 → Phase 3 社交？
- [ ] 还是希望一次性完整实现？

