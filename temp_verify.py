import re

with open('Database/008_MockData.sql', 'r', encoding='utf-8') as f:
    sql = f.read()

# basic parser
stmts = [s.strip() for s in sql.split(';') if s.strip()]

for stmt in stmts:
    if not stmt.upper().startswith('INSERT INTO'):
        continue
    
    # regex extract column part and values part
    m = re.search(r'INSERT INTO `?(\w+)`?\s*\(([^)]+)\)\s*VALUES', stmt, re.IGNORECASE | re.DOTALL)
    if not m:
        m2 = re.search(r'INSERT INTO `?(\w+)`?\s+VALUES', stmt, re.IGNORECASE | re.DOTALL)
        if m2:
            print(f"Table {m2.group(1)} has NO column list specified! This will fail if DB columns changed.")
            continue
        print("Could not parse statement:", stmt[:100])
        continue
        
    table_name = m.group(1)
    col_str = m.group(2)
    
    # count columns correctly handling newlines
    cols = [c.strip() for c in col_str.split(',')]
    num_cols = len(cols)
    
    # Extract values: text following VALUES
    vals_str = stmt[m.end():].strip()
    
    rows = []
    in_str = False
    paren_depth = 0
    curr_row = ""
    i = 0
    while i < len(vals_str):
        c = vals_str[i]
        if c == "'" and (i == 0 or vals_str[i-1] != '\\'):
            in_str = not in_str
            if paren_depth > 0: curr_row += c
        elif not in_str:
            if c == '(':
                if paren_depth == 0:
                    curr_row = ""
                else:
                    curr_row += c
                paren_depth += 1
            elif c == ')':
                paren_depth -= 1
                if paren_depth == 0:
                    rows.append(curr_row)
                    curr_row = ""
                else:
                    curr_row += c
            else:
                if paren_depth > 0: curr_row += c
        else:
            if paren_depth > 0: curr_row += c
        i += 1

    print(f"\nChecking Table {table_name} (Expected cols: {num_cols})")
    for row_idx, r in enumerate(rows):
        val_count = 1
        in_s = False
        pd = 0
        j = 0
        while j < len(r):
            c = r[j]
            if c == "'": 
                in_s = not in_s
            elif not in_s:
                if c == '(': pd += 1
                elif c == ')': pd -= 1
                elif c == ',' and pd == 0:
                    val_count += 1
            j += 1
        
        if val_count != num_cols:
            print(f"  [!!!] ROW {row_idx+1} MISMATCH: values={val_count}, columns={num_cols}")
            print(f"        Row data: {r[:80]}...")
            break
