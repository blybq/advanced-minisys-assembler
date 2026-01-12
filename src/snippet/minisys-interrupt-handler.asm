# ===== minisys-interrupt-handler.asm =====

interruptServer0:
  # 时钟中断处理程序（中断号0）
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
  
	lui	$t0, 0
	ori	$t0, $t0, 61440
	lw	$t1, a($0)
	nop
	nop
	and	$t2, $t1, $t0
	sw	$t2, 0($sp)
	addiu	$t3, $zero, 1
	add	$t4, $t1, $t3
	sw	$t4, 4($sp)
	addiu	$t5, $zero, 4095
	lw	$t6, 4($sp)
	nop
	nop
	and	$t7, $t6, $t5
	sw	$t7, 4($sp)
	lw	$t8, 0($sp)
	nop
	nop
	nor	$t9, $t8, $t8
	lw	$t0, 4($sp)
	nop
	nop
	nor	$t0, $t0, $t0
	and	$t0, $t9, $t0
	nor	$t0, $t0, $t0
	sw	$t0, a($0)
	addiu	$sp, $sp, 8

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

	addiu	$t0, $zero, 4095
	lw	$t1, a($0)
	nop
	nop
	and	$t2, $t1, $t0
	sw	$t2, 0($sp)
	lui	$t3, 65535
	ori	$t3, $t3, 64528
	lw	$t4, 0($t3)
	nop
	nop
	sw	$t4, 4($sp)
	addiu	$t5, $zero, 12
	lw	$t6, 4($sp)
	nop
	nop
	sllv	$t7, $t6, $t5
	sw	$t7, 4($sp)
	lw	$t8, 0($sp)
	nop
	nop
	nor	$t9, $t8, $t8
	lw	$t0, 4($sp)
	nop
	nop
	nor	$t0, $t0, $t0
	and	$t0, $t9, $t0
	nor	$t0, $t0, $t0
	sw	$t0, a($0)
	addiu	$sp, $sp, 8
  
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