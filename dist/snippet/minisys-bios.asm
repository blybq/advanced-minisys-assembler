# ====== minisys-bios.asm ======
    lui $sp, 1 # init $sp
    # -----------------------------
    addi $s1,$zero,0xFFFF
    addi $s7,$zero,0xFC60   # LED基址
    sw	 $s1,0($s7)         # LED全亮
    # 数码管刷新SEU09172
    # lui  $s5,8
    addi $s5,$zero,0x000A
    addi $s3,$zero,0xFC00   # 段码基址
    addi $s4,$zero,0xFC04   # 位码基址

    addi $s6,$zero,8 # off
_bios_label1:
    addi $s1,$zero,2        # 2
    addi $s2,$zero,7 # loc
    sw   $s1,0($s3)
    sw   $s2,0($s4)
    jal _delay
    nop
    nop
    sw   $s6,0($s4)
    nop
    addi $s1,$zero,0       # 0
    addi $s2,$zero,6 # loc
    sw   $s1,0($s3)
    sw   $s2,0($s4)
    jal _delay
    nop
    nop
    sw   $s6,0($s4)
    nop
    addi $s1,$zero,2       # 2
    addi $s2,$zero,5 # loc
    sw   $s1,0($s3)
    sw   $s2,0($s4)
    jal _delay
    nop
    nop
    sw   $s6,0($s4)
    nop
    addi $s1,$zero,6        # 6
    addi $s2,$zero,4 # loc
    sw   $s1,0($s3)
    sw   $s2,0($s4)
    jal _delay
    nop
    nop
    sw   $s6,0($s4)
    nop
    addi $s1,$zero,0        # 0
    addi $s2,$zero,3 # loc
    sw   $s1,0($s3)
    sw   $s2,0($s4)
    jal _delay
    nop
    nop
    sw   $s6,0($s4)
    nop
    addi $s1,$zero,1        # 1
    addi $s2,$zero,2 # loc
    sw   $s1,0($s3)
    sw   $s2,0($s4)
    jal _delay
    nop
    nop
    sw   $s6,0($s4)
    nop
    addi $s1,$zero,0        # 0
    addi $s2,$zero,1 # loc
    sw   $s1,0($s3)
    sw   $s2,0($s4)
    jal _delay
    nop
    nop
    sw   $s6,0($s4)
    nop
    addi $s1,$zero,1        # 1
    addi $s2,$zero,0 # loc
    sw   $s1,0($s3)
    sw   $s2,0($s4)
    jal _delay
    nop
    nop
    sw   $s6,0($s4)
    nop
    addi $s5,$s5,-1             # 刷一遍计数-1
    beq  $s5,$zero,_bios_label3
    nop
    j    _bios_label1
    nop
_bios_label3:
    sw   $zero,0($s7)           # 关LED 
    sw   $s6,0($s4)             # 关数码管 
    # -----------------------------
    jal main
    nop
    # close 7seg
    addi $s4,$zero,0xFC04   # 位码基址
    addi $s6,$zero,8 # off
    sw   $s6,0($s4)         # 关数码管 
    syscall

_delay:
    addi $sp, $sp, -4             # 分配栈空间保存$ra
    sw   $ra, 0($sp)              # 保存返回地址
    
    addi $t0,$zero,25000          # 循环计数（50MHz: 25000*20ns=500ms=0.5秒）
    # 如果你的CPU频率不同，调整这个值：
    # 25MHz: 12500, 100MHz: 50000
_delay_loop:
    addi $t0,$t0,-1
    bne  $t0,$zero,_delay_loop
    nop
    
    lw   $ra, 0($sp)              # 恢复返回地址
    addi $sp, $sp, 4              # 释放栈空间
    jr   $ra                      # 返回调用点
    nop


# ====== minisys-bios.asm ======
