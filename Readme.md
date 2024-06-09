# （E）BNFっぽいパーサジェネレータ

## BNF部定義

* 実際の実装とは色々と違う部分もあるけれど、概ね下記のBNFのようなイメージで定義。

```bnf
<ebnf> ::= <line> | <line> <ebnf>
<line> ::= <assign> | <assign> <comment>
<comment> ::= '//' <string> '\n'
<assign> ::= <assign1> | <assign2>
<assign1> ::= <nonTerminal> '=' <token> | <nonTerminal> '=' <define> | <assign1> '|' <token> | <assign1> '|' <define> |  <nonTerminal> '::=' <token> | <nonTerminal> '::=' <define> | <assign1> '|' <token> | <assign1> '|' <define>
<token> ::= '<' define '>' | <token> <define> | <define> <token>
<assign2> ::= '<' <nonTerminal> '>' '=' <define> | <assign2> '|' <define> |  '<' <nonTerminal> '>' '::=' <define> | <assign2> '|' <define>
<define> ::= <repeat> | <repeat> '|' <define>
<repeat> ::= <factor> | <leaf> '+' | <leaf> '*'
<factor> ::= <leaf> | <option>
<option> ::= '[' <define> ']'
<leaf> ::= <terminal> | <nonTerminal> | '(' <define> ')'
<terminal> ::= '"' <string> '"' | <charset>
<charset> ::= "'" <string> "'"
<nonTerminal> ::= <string>
```

* 左再帰を解析できないため、左再帰が出現する際には手動でBNF自体をループ構造に変更すること
* 一般的なBNFだと<>は非終端記号だったりするけれど、本パーサでは構文の（大体）トークンを意味する宣言として扱う
  * <>で定義した項に対して演算を後述する方法で演算を定義可能
* charsetでは例えばa~zまでを定義したい場合に`'a-z'`と定義可能。また`'abc'`と記述すると`"a" | "b" | "c"`と等価となる
* 単に`\w`と書くと`'_abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'`と等価
* 単に`\s`と書くと`' \t\n'`と等価
* 単に`\d`と書くと`'0123456789'`と等価
* 単に`.`と書くとあらゆる1文字にマッチする終端文字として扱う。（.+や.*と書くと解析不能になると思う。試してないけど
* 終端文字列としてi"String"と書くとStringの大文字小文字は無視する

## 定義サンプル

* 四則演算を定義したい場合、下記のようなBNFと演算子定義配列を用意する

```js
const bnf = `
e = "" // 空集合は''で表現不可
w = \\s | \\s w 
white = w | e
not_zero = '1-9'
digit = \\d
digits = digit | digit digits
integer = white '0' white | white int white
int = not_zero int_l  // 左再帰は不可なので、ループ表現に変える。またはint = not_zero digits*とする
int_l = digits int_l | e
float = integer | white '0.' digits white | white int '.' digits white
sign = white '+' white | white '-' white | white '+' sign | white '-' sign
<number> = [sign] (integer | float)
expr = term | term <'+'|'-'> expr
term = factor | factor <'*'|'/'> term
factor = number | white '(' <expr> ')' white
`
const formulas = [
    {
        match: '+',
        formula: (self, left, right) => {
            // formula(self, ...[brother elements array(appearance order)])
            return left.value + right.value;
        }
    }, {
        match: {
            bnf:'-',
            nonTerminal:'expr'
        },
        formula: (self) => {
            // term <'+'|'-'> expr 
            // term: arguments[0]
            // expr: arguments[1]
            const left = self.arguments[0];
            const right = self.arguments[1];
            return left.value - right.value;
        }
    }, {
        match: {
            nonTerminal:'term'
        },
        formula: (self) => {
            // factor <'*'|'/'> term
            // factor: arguments.factor
            // term: arguments.term
            const left = self.arguments.factor;
            const right = self.arguments.term;
            if(self.str === '*') {
                return left.value * right.value;
            }
            return left.value / right.value;
        }
    },  {
        match: '<number>',
        formula: (self) => {
            return Number(self.str);
        }
    }, {
        match: {
            nonTerminal:'factor'
        },
        formula: (self) => {
            return self.arguments.expr.value;
        }
    },
];
const lexicalAnalyser = new LexicalAnalyser(bnf, formulas);
const expr = '(1 + 10) * (-1 - 2)  - (0.2 * 2)';
const entryPoint = 'expr'
const result = lexicalAnalyser.parse(expr, entryPoint);
console.log(result.value);
```

* 例えば`number <'+'> number`の引数を取得する場合`left = self.arguments.number[0]; right = self.arguments.number[1]`となる
* matchのヒット条件詳細はTokenクラスのgetFormula関数を参照
