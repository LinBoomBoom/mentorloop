; 安装/更新前置钩子：强制结束任何正在运行的 MentorLoop 实例。
; 背景：桌面端关闭窗口只是最小化到托盘（进程常驻），且采用单实例锁。
; 若不杀进程，覆盖安装后用户再次双击只会聚焦旧实例，看到的是旧内存/旧库状态，
; 造成「装了新版却显示旧内容」的错觉。这里在安装最早期 taskkill，确保更新必然重启到新进程。
!macro NSIS_HOOK_PREINIT
  ; /f 强制终止，/im 按 exe 名匹配；忽略「未找到进程」的错误码。
  ExecWait 'taskkill /f /im MentorLoop.exe'
!macroend
