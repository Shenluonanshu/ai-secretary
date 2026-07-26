"use client";

export function Sidebar() {
  return (
    <aside className="sidebar">
      <div className="logo">
        知行<span>·</span>
      </div>
      <p>你的时间，值得被认真安排。</p>
      <nav>
        <a className="selected">▦ 总览</a>
        <a href="#calendar">◷ 我的日程</a>
        <a href="#planner">✦ 行程规划</a>
        <a href="#insights">◌ 时间洞察</a>
      </nav>
      <div className="side-bottom">
        <div className="avatar">我</div>
        <div>
          <b>我的空间</b>
          <small>Asia/Shanghai</small>
        </div>
      </div>
    </aside>
  );
}
