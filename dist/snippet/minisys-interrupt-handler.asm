# ===== minisys-interrupt-handler.asm =====

interruptServer0:
  # 时钟中断处理程序（中断号0）
  # 保存寄存器
  push $t0
  push $t1
  push $t2
  push $t3
  push $a0
  push $a1
  push $ra
  
  # TODO: 在这里添加时钟中断处理逻辑
  # 示例：可以从全局变量读取值，进行处理，然后写回
  
  # 恢复寄存器
  pop $ra
  pop $a1
  pop $a0
  pop $t3
  pop $t2
  pop $t1
  pop $t0
  
  # 返回
  eret
  nop

interruptServer1:
  # 键盘中断处理程序（中断号1）
  # 保存寄存器
  push $t0
  push $t1
  push $t2
  push $t3
  push $a0
  push $a1
  push $ra
  
  # TODO: 在这里添加键盘中断处理逻辑
  # 示例：读取键盘寄存器值，进行处理，然后写回全局变量
  
  # 恢复寄存器
  pop $ra
  pop $a1
  pop $a0
  pop $t3
  pop $t2
  pop $t1
  pop $t0
  
  # 返回
  eret
  nop

_syscall:
  # syscall处理程序（中断号5，作为异常处理）
  # 保存寄存器
  push $t0
  push $t1
  push $t2
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
  pop $t2
  pop $t1
  pop $t0
  
  # 返回
  eret
  nop

# ===== minisys-interrupt-handler.asm =====