while True:
    a=int(input("Cual es tu peso"))
    if a >= 100:
        print("NO subo gordas")
        c=int(input('fin?[1]Si [2]no'))
        if c == 2:
            break
    else:
        print("Ta bien we")
        c=int(input('fin?[1]Si [2]no'))
        if c == 2:
            break