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
<terminal> ::= '"' <string> '"' | "'" <string> "'"
<nonTerminal> ::= <string>
```

* 左再帰を解析できないため、左再帰が出現する際には手動でBNF自体をループ構造に変更すること

## 定義サンプル

* 四則演算を定義したい場合、下記のようなBNFと演算子定義配列を用意する

```js
const bnf = `
e = ''
w = ' ' | ' ' w | '\t' | '\t' w | '\n' | '\n' w
white = w | e
not_zero = '1' | '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9'
digit = '0' | not_zero
digits = digit | digit digits
integer = white '0' white | white int white
int = not_zero int_l
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
        match: '-',
        formula: (self, left, right) => {
            return left.value - right.value;
        }
    }, {
        match: '*',
        formula: (self, left, right) => {
            return left.value * right.value;
        }
    }, {
        match: '/',
        formula: (self, left, right) => {
            return left.value / right.value;
        }
    }, {
        match: '<number>',
        formula: (self) => {
            return Number(self.str);
        }
    }, {
        match: '<expr>',
        formula: (self) => {
            return self.children[0].value;
        }
    },
];
const lexicalAnalyser = new LexicalAnalyser(bnf, formulas);
const expr = '(1 + 10) * (-1 - 2)  - (0.2 * 2)';
const entryPoint = 'expr'
const syntax = lexicalAnalyser.parse(expr, entryPoint);
console.log(syntax.value);
```

* matchのヒット条件詳細はTokenクラスのgetFormula関数を参照
