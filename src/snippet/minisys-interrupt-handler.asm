# ===== minisys-interrupt-handler.asm =====

interruptServer0:
  # 时钟中断处理程序（中断号0）
  # 点亮LED的20-23位（RED的高4位，对应0x00F00000）
  # 保存所有临时寄存器
  push $t0
  push $t1
  push $t2
  push $t3
  push $t4
  push $t5
  push $t6
  push $t7
  push $t8
  push $t9
  
  # 首先读取timer status寄存器以清除中断请求
  lui $t2, 65535
  ori $t2, $t2, 64544        # timer status1地址 0xFFFFFC20
  lw $t2, 0($t2)             # 读取status1，同时清除中断请求
  nop
  nop
  
  # 设置LED地址 0xFFFFFC60
  lui $t0, 65535
  ori $t0, $t0, 64608        # LED地址 0xFFFFFC60
  
  # 设置20-23位为1（0x00F00000）
  lui $t1, 15               # $t1 = 0x000F0000 (15 << 16)
  sll $t1, $t1, 4           # 左移4位得到 0x00F00000
  
  # 写入LED寄存器
  sw $t1, 0($t0)
  nop
  nop
  
  # 恢复所有临时寄存器
  pop $t9
  pop $t8
  pop $t7
  pop $t6
  pop $t5
  pop $t4
  pop $t3
  pop $t2
  pop $t1
  pop $t0
  eret
  nop

interruptServer1:
  # 键盘中断处理程序（中断号1）
  # 点亮LED的16-19位（RED的低4位，对应0x000F0000）
  # 保存所有临时寄存器
  push $t0
  push $t1
  push $t2
  push $t3
  push $t4
  push $t5
  push $t6
  push $t7
  push $t8
  push $t9
  
  # 首先读取键盘寄存器以清除中断请求
  lui $t2, 65535
  ori $t2, $t2, 64528        # 键盘地址 0xFFFFFC10
  lw $t2, 0($t2)             # 读取键盘值，同时清除中断请求
  nop
  nop
  
  # 设置LED地址 0xFFFFFC60
  lui $t0, 65535
  ori $t0, $t0, 64608        # LED地址 0xFFFFFC60
  
  # 设置16-19位为1（0x000F0000）
  addi $t1, $zero, 15        # $t1 = 15 (0x0F)
  sll $t1, $t1, 16           # 左移16位得到 0x000F0000
  
  # 写入LED寄存器
  sw $t1, 0($t0)
  nop
  nop

  lui $t3, 16
  ori $t3, $t3, 0

  _delay_in_interrupt:
	addi $t3, $t3, -1
	bne $t3, $zero, _delay_in_interrupt
	nop
	nop
  
  # 恢复所有临时寄存器
  pop $t9
  pop $t8
  pop $t7
  pop $t6
  pop $t5
  pop $t4
  pop $t3
  pop $t2
  pop $t1
  pop $t0
  eret
  nop


_syscall:
  # syscall处理程序（中断号5，作为异常处理）
  # 保存寄存器
  push $t0
  push $t1
  push $t2
  push $t3
  push $t4
  push $t5
  push $t6
  push $t7
  push $t8
  push $t9
  push $v0
  push $s0
  
  # syscall处理逻辑
  # 示例：点亮最后4个LED
  addi $t0, $zero, 0x000F
  lui $t1, 65535
  ori $t1, $t1, 64608        # LED地址 0xFFFFFC60
  sw $t0, 0($t1)
  nop
  nop
  
  # 恢复寄存器
  pop $s0
  pop $v0
  pop $t9
  pop $t8
  pop $t7
  pop $t6
  pop $t5
  pop $t4
  pop $t3
  pop $t2
  pop $t1
  pop $t0
  
  # 返回
  eret
  nop

# ===== minisys-interrupt-handler.asm =====