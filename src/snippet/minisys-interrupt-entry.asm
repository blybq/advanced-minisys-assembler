# ===== minisys-interrupt-handler-entry.asm =====
# 中断向量表（IVBR = 0x0000F000）
j interruptServer0    # 中断号0：时钟中断（0xF000 + 0*4 = 0xF000）
j interruptServer1    # 中断号1：键盘中断（0xF000 + 1*4 = 0xF004）
nop                   # 中断号2：预留（0xF000 + 2*4 = 0xF008）
nop                   # 中断号3：预留（0xF000 + 3*4 = 0xF00C）
nop                   # 中断号4：预留（0xF000 + 4*4 = 0xF010）
j _syscall            # 中断号5：syscall（作为异常处理）（0xF000 + 5*4 = 0xF014）
# ===== minisys-interrupt-handler-entry.asm =====
