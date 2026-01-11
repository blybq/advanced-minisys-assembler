_int_handler_syscall:
  # handler of syscall
  # light last 4 leds
  addi $t0, $zero, 0x000F
  lui $t1, 65535
  ori $t1, $t1, 64608        # LED地址
  sw $t0, 0($t1)
  nop
  nop
  pop Ss0
  pop $v0
  pop $t2
  pop $t1
  pop $t0
  eret
  nop

