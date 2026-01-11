# ===== minisys-interrupt-handler-entry.asm =====
    push $t0
    push $t1
    push $t2
    push $v0
    push $s0

    mfc0 $t0, $13, 0        # $t0 <- CP0 Cause
    andi $t1, $t0, 0x007C   # keep only ExcCode[4:0] at Cause 2-6

    lui $s0, 65535
    ori $s0, $s0, 64608
    addi $v0, $zero, 0x00FF
    

    addi $t2, $zero, 0x0020 # Cause 2-6 of syscall is 01000
    beq $t1, $t2, _int_handler_syscall
    nop

    sw $v0, 0($s0)
    # 如果不是syscall异常，恢复寄存器并返回
    pop $s0
    pop $v0
    pop $t2
    pop $t1
    pop $t0
    eret
    nop
# ===== minisys-interrupt-handler-entry.asm =====

