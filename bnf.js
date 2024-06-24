"use strict"

class myconsoleClass {
    constructor() {
    }
    getLineNumber(depth = 0) {
        const customPrepareStackTrace = (error, structuredStackTrace) => {
            return structuredStackTrace[depth].getLineNumber();
        }
        const original = Error.prepareStackTrace;
        Error.prepareStackTrace = customPrepareStackTrace;
        const error = {};
        Error.captureStackTrace(error, this.getLineNumber);
        const lineNumber = error.stack;
        Error.prepareStackTrace = original;
        return lineNumber;
    }
    get lineNumber() {
        return this.getLineNumber(1);
    }
    log(...args) {
        console.log(this.getLineNumber(1), ...args);
    }
    error(...args) {
        console.error(this.getLineNumber(1), ...args);
    }
    warn(...args) {
        console.warn(this.getLineNumber(1), ...args);
    }
}
const myconsole = new myconsoleClass();

class StringObject {
    #ptr;
    #endptr;
    #str = [];
    constructor(str) {
        this.str = str;
    }
    back() {
        if(this.#ptr > 0) {
            this.#ptr--;
        }
    }
    shift() {
        if(this.#ptr >= this.#endptr) {
            return "";
        }
        this.#ptr++;
        return this.#str[this.#ptr - 1];
    }
    pop() {
        if(this.#endptr <= this.#ptr) {
            return "";
        }
        this.#endptr--;
        return this.#str[this.#endptr];
    }
    get str() {
        return this.#str.slice(this.#ptr, this.#endptr).join('');
    }
    set str(str) {
        this.#str = [...str];
        this.#ptr = 0;
        this.#endptr = str.length;
    }
    prevChars(len = 1) {
        return this.#str.slice(Math.max(this.#ptr - len, 0), this.#ptr).join('');
    }
    read(index, len = 1) {
        return this.#str.slice(index, index + len).join('');
    }
}

class Operand {
    #parent;
    #index;
    #caseInsenitive;
    #offset = 0;
    constructor(obj, open, close, caseInsenitive = false) {
        this.own = obj;
        this.open = open;
        this.close = close;
        this.#caseInsenitive = caseInsenitive;
    }
    get depth () {
        if(this.parent === undefined) {
            return 0;
        }
        return this.parent.depth + 1;
    }
    get parent() {
        return this.#parent;
    }
    set parent(val) {
        return this.#parent = val;
    }
    get serialize() {
        return [this];
    }
    get index() {
        return this.#index;
    }
    set index(val) {
        return this.#index = val;
    }
    get symbol () {
        return this.own;
    }
    get view() {
        return this.open + this.symbol + this.close;
    }
    search(lens, serialized, operand, addlen) {
        const index = serialized.findIndex(op => op === operand);
        return lens.filter((cur, i) => i < index).reduce((a, b) => a + b, 0) + Math.ceil(operand.view.length / 2 + addlen / 2) - 1;
    }
    print(lstr = '', rstr = '') {
        const addlen = lstr.length + rstr.length;
        const serialized = this.serialize;
        const lens = serialized.map(op => op.view.length + addlen);
        const deps = serialized.map(op => op.depth);
        const sumlength = lens.reduce((acc, cur) => acc + cur, 0);
        const tmp = new Array(deps.reduce((acc, cur) => Math.max(acc, cur), 0) + 1);
        const strs = tmp.fill(0).map(e => ''.padStart(sumlength, ' '));
        const branchs = tmp.fill(0).map(e => ''.padStart(sumlength, ' '));
        let len = 0;
        for(const op of serialized) {
            const l = op.view.length;
            const before = strs[op.depth].slice(0, len);
            const after = strs[op.depth].slice(len+l);
            const branch = (() => {
                if(!(op instanceof Operator)) {
                    return '';
                }
                const lbranch = op.largs.reduce((acc, arg) => {
                    if(arg instanceof Group) {
                        acc = acc.concat(arg.own);
                        //acc.push(arg);
                    } else {
                        acc.push(arg);
                    }
                    return acc;
                }, []).map(o => this.search(lens, serialized, o, addlen));
                const rbranch = op.rargs.reduce((acc, arg) => {
                    if(arg instanceof Group) {
                        acc = acc.concat(arg.own);
                        //acc.push(arg);
                    } else {
                        acc.push(arg);
                    }
                    return acc;
                }, []).map(o => this.search(lens, serialized, o, addlen));
                const self = this.search(lens, serialized, op, addlen);
                let branchstr = '';
                if(lbranch.length) {
                    branchstr = ''.padStart(lbranch[0], ' ') + '┌';
                    for(let i = 1; i < lbranch.length; i++) {
                        branchstr += ''.padStart(lbranch[i] - lbranch[i - 1] - 1, '─') + '┬';
                    }    
                }
                if(lbranch.length && rbranch.length) {
                    branchstr += ''.padStart(self - lbranch.slice(-1)[0] - 1, '─') + '┴';
                } else if (lbranch.length) {
                    branchstr += ''.padStart(self - lbranch.slice(-1)[0] - 1, '─') + '┘';
                } else if (rbranch.length) {
                    branchstr += ''.padStart(self, ' ') + '└';
                }
                if (rbranch.length) {
                    rbranch.unshift(self);
                    for(let i = 1; i < rbranch.length - 1; i++) {
                        branchstr += ''.padStart(rbranch[i] - rbranch[i-1] - 1, '─') + '┬';
                    }
                    branchstr += ''.padStart(rbranch[rbranch.length - 1] - rbranch[rbranch.length - 2] - 1, '─') + '┐';
                }
                return branchstr;
            })()
            const brBefore = branchs[op.depth].slice(0, branch.lastIndexOf(' ') + 1);
            const brAfter = branchs[op.depth].slice(branch.length);
            branchs[op.depth] = brBefore + branch.trim() + brAfter;
            strs[op.depth] = before + lstr + op.view + rstr + after;
            len += l + addlen;
        }
        for(let i = 0; i < strs.length; i++) {
            const str = strs[i];
            const br = branchs[i];
            myconsole.log(str);
            myconsole.log('\u001b[31m' + br + '\u001b[0m');
        }
    }
    get generateAnalyzer() {
        try {
            const self = this;
            return (strObj, index) => {
                const str = strObj.read(index, self.own.length);
                if(this.#caseInsenitive) {
                    if(str.toLowerCase() === self.own.toLowerCase()) {
                        return new Syntax(str, self);
                    }    
                } else {
                    if(str === self.own) {
                        return new Syntax(str, self);
                    }    
                }
                return undefined;
            }
        } catch(e) {
            myconsole.log(this.own);
            throw e;
        }
    }
    postProcess() {

    }
    toString() {
        const serialized = this.serialize;
        return serialized.map(op => op.view).join('');
    }
}

class CharSet extends Operand {
    constructor(obj, open, close) {
        super(obj, open, close);
        if(obj === '') {
            throw '空集合を定義する場合、文字セット定義' + open + ',' + close + 'を使用しないでください';
        }
    }
    get set() {
        const str = this.own.split('');
        const escs = {
            s: [' ', '\t', '\n'],
            t: ['\t'],
            n: ['\n'],
            w: "_abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789".split(''),
            d: "0123456789".split('')
        }
        const result = [];
        let esc = false;
        let range = false;
        const rangeFunc = (prev, cur) => {
            const prevCode = prev.slice(-1)[0].charCodeAt(0);
            const endCode = cur.slice(-1)[0].charCodeAt(0);
            const diff = endCode - prevCode;
            const tmp = new Array(diff + 1);
            Array.prototype.push.apply(prev, tmp.fill(0).map((cur, i) => String.fromCharCode(prevCode + i)));
        };
        while (str.length) {
            const char = str.shift();
            if(esc){
                if(range) {
                    if(char in escs) {
                        rangeFunc(result, escs[char]);
                    } else {
                        rangeFunc(result, [char]);
                    }
                    range = false;
                } else {
                    if(char in escs) {
                        Array.prototype.push.apply(result, escs[char]);
                    } else {
                        result.push(char);
                    }
                }
                esc = false;
            } else {
                if(char === '\\') {
                    esc = true;
                } else if (range) {
                    rangeFunc(result, [char]);
                    range = false;
                } else if (char === '-') {
                    if(result.length) {
                        range = true;
                    } else {
                        result.push(char);
                    }
                } else {
                    result.push(char);
                }
            }
        }
        return new Set(result);
    } 
    match(char) {
        if(char.length !== 1) {
            return false;
        }
        return this.set.has(char);
    }
    get generateAnalyzer() {
        try {
            const self = this;
            return (strObj, index) => {
                const s = strObj.read(index, 1);
                if(!this.set.has(s)) {
                    return undefined;
                }
                return new Syntax(s, self, []);
            }
        } catch(e) {
            myconsole.log(this.own);
            throw e;
        }
    }
}

class Group extends Operand {
    #parent;
    constructor(own, open, close) {
        super(own, open, close);
    }
    set parent(val) {
        this.own.forEach(op => {
            //op.parent = val;
            op.parent = this;
        });
        this.#parent = val;
    }
    get parent() {
        return this.#parent;
    }
    get serialize() {
        return this.own.reduce((acc, operand) => {
            acc = acc.concat(operand.serialize);
            return acc;
        }, []);
    }
    get view() {
        return this.open + this.close;
    }
    get depth () {
        if(this.parent === undefined) {
            return 0;
        }
        return this.parent.depth;
    }
    get generateAnalyzer() {
        try {
            const self = this;
            return (strObj, index) => {
                const analyze = ((args) => {
                    let len = 0;
                    let str = "";
                    const children = [];
                    for(let i = 0; i < args.length; i++) {
                        const s = args[i].generateAnalyzer(strObj, index + len);
                        if(s === undefined) {
                            return undefined;
                        }
                        len += s.length;
                        str += s.str;
                        children.push(s);
                    }
                    return new Syntax(str, self, children);
                });
                return analyze(self.own);
            }
        } catch(e) {
            myconsole.log(this.own);
            throw e;
        }
    }
    postProcess() {
        this.own.forEach(op => op.postProcess());
    }
}

class Option extends Group {
    constructor(own, open, close) {
        super(own, open, close);
    }
    get generateAnalyzer() {
        try {
            const self = this;
            return (strObj, index) => {
                const analyze = ((args) => {
                    let len = 0;
                    let str = "";
                    const children = [];
                    for(let i = 0; i < args.length; i++) {
                        const s = args[i].generateAnalyzer(strObj, index + len);
                        if(s === undefined) {
                            return new Syntax('', self, []);
                        }
                        len += s.length;
                        str += s.str;
                        children.push(s);
                    }
                    return new Syntax(str, self, children);
                });
                return analyze(self.own);
            }
        } catch(e) {
            myconsole.log(this.own);
            throw e;
        }
    }
}

class NonTerminalSymbol extends Operand {
    #NonTerminals;
    constructor(keyword, nonTerminals, open, close) {
        super(keyword, open, close);
        this.#NonTerminals = nonTerminals;
    }
    get symbol() {
        return this.own;
    }
    get view() {
        return this.own;
    }
    get generateAnalyzer() {
        try {
            return this.#NonTerminals[this.symbol].analyzer;
        } catch (e) {
            myconsole.log(this);
            throw e;
        }
    }
    checkLeftRecursive() {
        const org = {};
        const orgKey = this.symbol;
        const depth = [];
        const pseudo = {};
        for(const key in this.#NonTerminals) {
            org[key] = this.#NonTerminals[key].analyzer;
            pseudo[key] = (strObj, index) => {
                depth.push(key);
                if(key === orgKey && depth.length > 1) {
                    throw "たぶん左再帰となる定義が含まれています：" + key;
                }
                return org[key](strObj, index);
            }
            this.#NonTerminals[key].analyzer = pseudo[key];
        }
        const str = new StringObject('');
        try {
            this.generateAnalyzer(str, 0);
        } catch(e) {
            if(e instanceof RangeError) {
            } else {
                myconsole.warn(e);
            }
        }
        for(const key in this.#NonTerminals) {
            this.#NonTerminals[key].analyzer = org[key];
        }
    }
    postProcess() {

    }
}

class ExtendedBackusNaurFormAnalyser {
    /*
    // x : 終端記号 or 非終端記号 or 式
    // y : 非終端記号
    // t : 非終端記号名称
    // a : 文字列
    // comment : コメント
    // y::=x
    // x|x
    // x+
    // x*
    // <t>
    // (x)
    // 'a'
    // "a"
    // [x]
    // // comment
    */
    #NonTerminals = {}
    #formulas;
    constructor(bnf, formulas, isBnf = false) {
        this.isBnf = isBnf;
        this.#formulas = formulas;
        this.lexicals = this.analyze(bnf);
        this.trees = [];
        for(const l of this.lexicals) {
            const line = l[0];
            if(line.includes('::=') || line.includes('=')) {
                if(line.reduce((acc, cur) => {
                    if(cur === '::=' || cur === '=') {
                        acc++;
                    }
                    return acc;
                }, 0) > 1) {
                    throw "There can be only one assignment expression per line.\n" + line.join('');
                }
                const tree = this.parseTree(line);
                if(tree.length !== 1) {
                    throw new Error("なんかおかしい");
                }
                this.record(tree[0]);
                this.trees.push(tree[0]);
            }
        }
        for(const tree of this.trees) {
            const nonTerminal = tree.largs[0];
            if(nonTerminal instanceof Token) {
                nonTerminal.own[0].checkLeftRecursive();
            } else {
                nonTerminal.checkLeftRecursive();
            }
            tree.postProcess();
        }
        //myconsole.log(this.#NonTerminals);
    }
    analyze(str) {
        const strObj = new StringObject(str);
        const tokens = [];
        while(1) {
            const line = this.parseLine(strObj);
            tokens.push(line);
            while(strObj.shift() === '\n');
            if(strObj.str === '') {
                break;
            }
            strObj.back();
        }
        return tokens;
    }
    parseLine(strObj, close = '\n', escape = '\\') {
        const candidates = ['::=', '=', '|', '<', '>', '+', '*', '(', ')', '[', ']', '"', ,'i"', "'", '//', '.', '\\w', '\\d', '\\s', '$', '!'];
        const isEBNFs = ['+', '*', '(', '['];
        const whites = [' ', '\t', '\n'];
        const others = /^[^\t\n \:=\|\<\>\+\*\(\)\[\]\'\"\/\\\$\!]+$/;
        const flags = {
            "<": {
                state:false,
                type: 'name',
                escape: '\\',
                close: ">"
            },
            "(": {
                state:false,
                type: 'expr',
                escape: '\\',
                close: ")"
            },
            "[": {
                state:false,
                type: 'expr',
                escape: '\\',
                close: "]",
            },
            "//": {
                state:false,
                type: 'comment',
                close: "\n",
                parseLine: (strObj) => {
                    const close = "\n";
                    let str = '';
                    while(1) {
                        const c = strObj.shift();
                        if(c === close) {
                            strObj.back();
                            break;
                        }
                        if(c === '') {
                            break;
                        }
                        str += c;
                    }
                    return [[str], close];
                },
            },
            "'": {
                state:false,
                type: 'terminal',
                escape: '\\',
                close: "'",
                parseLine: (strObj) => {
                    const close = "'";
                    let str = '';
                    while(1) {
                        const c = strObj.shift();
                        if(c === close) {
                            if(!/(^|[^\\])(\\\\)*\\$/.test(str)) {
                                break;
                            }
                        }
                        if(c === '') {
                            throw "parse error:\n" + str;
                        }
                        str += c;
                    }
                    return [[str], close];
                },
            },
            '"': {
                state:false,
                type: 'terminal',
                escape: '\\',
                close: '"',
                parseLine: (strObj) => {
                    const close = '"';
                    let str = '';
                    while(1) {
                        const c = strObj.shift();
                        if(c === close) {
                            if(!/(^|[^\\])(\\\\)*\\$/.test(str)) {
                                break;
                            }
                        }
                        if(c === '') {
                            throw "parse error:\n" + str;
                        }
                        str += c;
                    }
                    return [[str], close];
                },
            },
            'i"': {
                state:false,
                type: 'terminal',
                escape: '\\',
                close: '"',
                parseLine: (strObj) => {
                    const close = '"';
                    let str = '';
                    while(1) {
                        const c = strObj.shift();
                        if(c === close) {
                            if(!/(^|[^\\])(\\\\)*\\$/.test(str)) {
                                break;
                            }
                        }
                        if(c === '') {
                            throw "parse error:\n" + str;
                        }
                        str += c;
                    }
                    return [[str], close];
                },
            },
        };
        let gotWord = '';
        const tokens = [];
        while(1) {
            const c = strObj.shift();
            if(c === '') {
                if(close !== '\n') {
                    throw gotWord + c + close;
                }
                if(gotWord !== '') {
                    tokens.push(gotWord);
                }
                break;
            }
            if(c === close) {
                if(escape) {
                    const escapeStr = "(^|[^" + escape + escape + "])(" + escape + escape + escape + escape + ")*" + escape + "$";
                    if(new RegExp(escapeStr).test(gotWord)) {
                        tokens.push(gotWord.slice(0, -1));
                        gotWord = '';
                        continue;
                    }
                }
                if(gotWord !== '') {
                    tokens.push(gotWord);
                }
                break;
            }
            const word = gotWord + c;
            if (candidates.includes(word)) {
                tokens.push(word);
                if(this.isBnf && isEBNFs.includes(word)) {
                    myconsole.log('This form is not bnf:', word);
                    this.isBnf = false;
                }
                if(Object.keys(flags).includes(word)) {
                    if(flags[word].parseLine) {
                        Array.prototype.push.apply(tokens, flags[word].parseLine(strObj, flags[word].close, flags[word].escape));
                    } else {
                        Array.prototype.push.apply(tokens, this.parseLine(strObj, flags[word].close, flags[word].escape));
                    }
                }
                gotWord = '';
            } else {
                if(whites.includes(c)) {
                    if(gotWord !== '') {
                        tokens.push(gotWord);
                    }
                    gotWord = '';
                } else if(others.test(gotWord) && !others.test(word)) {
                    tokens.push(gotWord);
                    gotWord = '';
                    strObj.back();
                } else {
                    gotWord += c;
                }
            }
        }
        return [tokens, close];
    }
    parseTree(tokens) {
        const terminals = [];
        const boxes = {
            terminal:[['"', '"'], ['i"', '"']], // ["'", "'"]],
            charSet: [["'", "'"]],
            comment:[['//', '\n']],
            //nonTerminal:[['<', '>']],
            //token:[],
            token:[['<', '>']],
            nonTerminal:[],
            group:[['(', ')']],
            option:[['[', ']']],
        };
        const operators = [
            [
                {
                    symbol: '=',
                    order : 0, // right
                    left:[1, 1],
                    right:[1, Infinity],
                    generateAnalyzer: (operator) => {
                        return (strObj, index) => {
                            const analyze = ((args) => {
                                let len = 0;
                                let str = "";
                                const children = [];
                                for(let i = 0; i < args.length; i++) {
                                    const s = args[i].generateAnalyzer(strObj, index + len);
                                    if(s === undefined) {
                                        return undefined;
                                    }
                                    children.push(s);
                                    len += s.length;
                                    str += s.str;
                                }
                                return new Syntax(str, operator.largs[0], children);
                            });
                            return analyze(operator.rargs);
                        }
                    }
                },    
            ],
            [
                {
                    symbol: '::=',
                    order : 0, // right
                    left:[1, 1],
                    right:[1, Infinity],
                    generateAnalyzer: (operator) => {
                        return (strObj, index) => {
                            const analyze = ((args) => {
                                let len = 0;
                                let str = "";
                                const children = [];
                                for(let i = 0; i < args.length; i++) {
                                    const s = args[i].generateAnalyzer(strObj, index + len);
                                    if(s === undefined) {
                                        return undefined;
                                    }
                                    children.push(s);
                                    len += s.length;
                                    str += s.str;
                                }
                                return new Syntax(str, operator.largs[0], children);
                            });
                            return analyze(operator.rargs);
                        }
                    }
                },    
            ],
            [
                {
                    symbol: '|',
                    order : 1, // left
                    left:[1, Infinity],
                    right:[1, Infinity],
                    generateAnalyzer: (operator) => {
                        return (strObj, index) => {
                            const analyze = ((args) => {
                                let len = 0;
                                let str = "";
                                const children = [];
                                for(let i = 0; i < args.length; i++) {
                                    const s = args[i].generateAnalyzer(strObj, index + len);
                                    if(s === undefined) {
                                        return undefined;
                                    }
                                    children.push(s);
                                    len += s.length;
                                    str += s.str;
                                }
                                return new Syntax(str, operator, children);
                            });
                            const left = analyze(operator.largs);
                            const right = analyze(operator.rargs);
                            if(left !== undefined && right !== undefined) {
                                if(left.length > right.length) {
                                    return left;
                                }
                                return right;
                            }
                            if(left !== undefined) {
                                return left;
                            }
                            if(right !== undefined) {
                                return right;
                            }
                            return undefined;
                        }
                    }
                },    
            ],
            [

                {
                    symbol: '!',
                    order : 1, // left
                    right:[1, 1],
                    left:[0, 0],
                    generateAnalyzer: (operator) => {
                        return (strObj, index) => {
                            let len = 0;
                            const s = operator.rargs[0].generateAnalyzer(strObj, index + len);
                            if(s !== undefined) {
                                return undefined;
                            }
                            return new Syntax("", operator, []);
                        }
                    }
                },
            ],
            [

                {
                    symbol: '$',
                    order : 1, // left
                    left:[1, 1],
                    right:[0, 0],
                    generateAnalyzer: (operator) => {
                        return (strObj, index) => {
                            let str = "";
                            let len = 0;
                            const children = [];
                            const s = operator.largs[0].generateAnalyzer(strObj, index + len);
                            if(s === undefined) {
                                return undefined;
                            }
                            str += s.str;
                            len += s.length;
                            children.push(s);
                            return new Syntax(str, operator, children);
                        }
                    }
                },
            ],
            [
                {
                    symbol: '+',
                    order : 1, // left
                    left:[1, 1],
                    right:[0, 0],
                    generateAnalyzer: (operator) => {
                        return (strObj, index) => {
                            let str = "";
                            let len = 0;
                            const children = [];
                            while(1) {
                                const s = operator.largs[0].generateAnalyzer(strObj, index + len);
                                if (s === undefined) {
                                    break;
                                }
                                str += s.str;
                                len += s.length;
                                children.push(s);
                            }
                            if(str !== '') {
                                return new Syntax(str, operator, children);
                            }
                            return undefined;
                        }
                    }
                },
                {
                    symbol: '*',
                    order : 1, // left
                    left:[1, 1],
                    right:[0, 0],
                    generateAnalyzer: (operator) => {
                        return (strObj, index) => {
                            let str = "";
                            let len = 0;
                            const children = [];
                            while(1) {
                                const s = operator.largs[0].generateAnalyzer(strObj, index + len);
                                if (s === undefined) {
                                    break;
                                }
                                str += s.str;
                                len += s.length;
                                children.push(s);
                            }
                            return new Syntax(str, operator, children);
                        }
                    }
                },    
            ],
            [
                {
                    symbol: '.',
                    order : 1, // left
                    left:[0, 0],
                    right:[0, 0],
                    generateAnalyzer: (operator) => {
                        return (strObj, index) => {
                            let str = strObj.read(index, 1);
                            const children = [];
                            if(str.length !== 1) {
                                return undefined;
                            }
                            return new Syntax(str, operator, children);
                        }
                    }
                },
                {
                    symbol: '\\d',
                    order : 1, // left
                    left:[0, 0],
                    right:[0, 0],
                    generateAnalyzer: (operator) => {
                        return (strObj, index) => {
                            let set = new Set("0123456789".split(''));
                            let str = strObj.read(index, 1);
                            const children = [];
                            if(!set.has(str)) {
                                return undefined;
                            }
                            return new Syntax(str, operator, children);
                        }
                    }
                },
                {
                    symbol: '\\w',
                    order : 1, // left
                    left:[0, 0],
                    right:[0, 0],
                    generateAnalyzer: (operator) => {
                        return (strObj, index) => {
                            let set = new Set("_0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ".split(''));
                            let str = strObj.read(index, 1);
                            const children = [];
                            if(!set.has(str)) {
                                return undefined;
                            }
                            return new Syntax(str, operator, children);
                        }
                    }
                },
                {
                    symbol: '\\s',
                    order : 1, // left
                    left:[0, 0],
                    right:[0, 0],
                    generateAnalyzer: (operator) => {
                        return (strObj, index) => {
                            let str = strObj.read(index, 1);
                            const children = [];
                            const whites = [' ', '\t', '\n'];
                            if(!whites.includes(str)) {
                                return undefined;
                            }
                            return new Syntax(str, operator, children);
                        }
                    }
                },

            ],
        ];
        for(let i = 0; i < operators.length; i++) {
            operators[i].forEach(op => op.priority = i);
        }
        const extract = (arr) => {
            const result = [];
            for(const elm of arr) {
                if(elm instanceof Array) {
                    Array.prototype.push.apply(result, extract(elm));
                } else {
                    result.push(elm);
                }
            }
            return result;
        };
        //const boxCandidates = new Set(extract([Object.keys(boxes).map(key => boxes[key])]));
        const boxCandidates = new Set(extract([Object.keys(boxes).map(key => boxes[key].map(r => r[0]))]));
        const opCandidates = new Set(extract(operators.map(ops => ops.map(op => op.symbol))));
        for(let i = 0; i < tokens.length; i++) {
            const token = tokens[i];
            if(boxCandidates.has(token)) {
                const close = tokens[i + 2];
                if(boxes.terminal.map(a => a[0]).includes(token)) {
                    // Push to expr array as terminal
                    // tokens[i + 1].length === 1のはず
                    terminals.push(new Operand(tokens[i+1][0], token, close, token === 'i"'));
                } else if(boxes.charSet.map(a => a[0]).includes(token)) {
                    terminals.push(new CharSet(tokens[i+1][0], token, close)); 
                } else if(boxes.comment.map(a => a[0]).includes(token)) {
                    // through
                    // do nothing
                } else if(boxes.nonTerminal.map(a => a[0]).includes(token)) {
                    // Add to dictionary
                    // And push to expr array as nonterminal
                    terminals.push(new NonTerminalSymbol(tokens[i+1][0], this.#NonTerminals, token, close));
                } else if(boxes.group.map(a => a[0]).includes(token)) {
                    // Push to expr array as object
                    terminals.push(new Group(this.parseTree(tokens[i+1]), token, close));
                } else if (boxes.token.map(a => a[0]).includes(token)) {
                    terminals.push(new Token(this.parseTree(tokens[i+1]), token, close, this.#formulas));
                } else if (boxes.option.map(a => a[0]).includes(token)) {
                    terminals.push(new Option(this.parseTree(tokens[i+1]), token, close));
                }
                i += 2;
            } else if (opCandidates.has(token)) {
                // Push to expr array as operator?
                const define = operators.find(ops => ops.find(op => op.symbol === token)).find(op => op.symbol === token);
                if(token === "$") {
                    terminals.push(new Argument(define));
                } else {
                    terminals.push(new Operator(define));
                }
            } else {
                // Add to dictionary
                // And push to expr array as nonterminal
                terminals.push(new NonTerminalSymbol(token, this.#NonTerminals));
            }
        }
        const priorityOrderGroups = terminals.map((cur, i) => {
            cur.index = i;
            return cur;
        }).filter(cur => cur instanceof Operator).sort((l, r) => r.own.priority - l.own.priority).reduce((acc, cur) => {
            if(acc.slice(-1)[0] === undefined) {
                acc.push([cur]);
            } else {
                if(acc.slice(-1)[0][0].priority === cur.priority) {
                    acc.slice(-1)[0].push(cur);
                } else {
                    acc.push([cur]);
                }
            }
            return acc;
        },[]);
        for(const operatorGroup of priorityOrderGroups) {
            for(const operator of operatorGroup) {
                const step = operator.step;
                for(let i = 0; i < operator[operator.reverse][1]; i++) {
                    const index = operator.index - (1 + i) * step;
                    if(index < 0 || terminals.length <= index) {
                        break;
                    }
                    if((terminals[index] instanceof Operator) && (terminals[index].priority <= operator.priority)) {
                        break;
                    }
                    if(terminals[index].parent) {
                        continue;
                    }
                    terminals[index].parent = operator;
                    operator.args[operator.reverse].push(terminals[index]);
                }
                for(let i = 0; i < operator[operator.order][1]; i++) {
                    const index = operator.index + (1 + i) * step;
                    if(index < 0 || terminals.length <= index) {
                        break;
                    }
                    if((terminals[index] instanceof Operator) && (terminals[index].priority < operator.priority)) {
                        break;
                    }
                    if(terminals[index].parent) {
                        continue;
                    }
                    terminals[index].parent = operator;
                    operator.args[operator.order].push(terminals[index]);
                }
            }
        }
        return terminals.filter(root => root.parent === undefined);
    }
    record(root) {
        if(!(root instanceof Operator) || (root.symbol !== "::=" && root.symbol !== '=')) {
            throw new Error("なんかおかしい");
        }
        const nonTerminal = (() => {
            if(root.largs[0] instanceof Token) {
                return root.largs[0].own[0];
            }
            return root.largs[0];
        })();
        if(!(nonTerminal instanceof NonTerminalSymbol)) {
            throw new Error("なんかおかしい");
        }
        if(!(nonTerminal.symbol in this.#NonTerminals)) {
            this.#NonTerminals[nonTerminal.symbol] = {};
        }
        if('analyzer' in this.#NonTerminals[nonTerminal.symbol]) {
            throw "二重登録:" + nonTerminal.symbol;
        }
        this.#NonTerminals[nonTerminal.symbol].analyzer = function(strObj, index) {
            return root.generateAnalyzer(strObj, index);
        }
    }
    execution(strObj, entryPoint = 'expr') {
        const analyzer = this.#NonTerminals[entryPoint].analyzer;
        return analyzer(strObj, 0);
    }
    print(left = '', right = '') {
        for(const tree of this.trees) {
            tree.print(left, right);
        }
    }
}

class Operator extends Operand  {
    constructor(define){
        super(define);
        this.args = {
            left:[],
            right: [],
        };
    }
    get serialize() {
        const left = this.largs.map(operand => operand.serialize).reduce((acc, cur) => {
            acc = acc.concat(cur);
            return acc;
        }, []);
        const right = this.rargs.map(operand => operand.serialize).reduce((acc, cur) => {
            acc = acc.concat(cur);
            return acc;
        }, []);
        const serialized = left.concat([this]).concat(right);
        return serialized;
    }
    get define() {
        return this.own;
    }
    get largs() {
        return this.args.left.slice().reverse();
    }
    get rargs() {
        return this.args.right.slice();
    }
    get left() {
        return this.own.left;
    }
    get right() {
        return this.own.right;
    }
    get priority() {
        return this.own.priority;
    }
    get symbol() {
        return this.own.symbol;
    }
    get order() {
        // order
        // 0: right, 1: left
        if(this.own.order === 1) {
            return 'left';
        }
        return 'right';
    }
    get reverse() {
        if(this.own.order === 1) {
            return 'right';
        }
        return 'left';
    }
    get step() {
        if(this.own.order === 1) {
            return -1;
        }
        return 1;
    }
    get view() {
        return this.symbol;
    }
    get generateAnalyzer() {
        const self = this;
        try {
            return self.define.generateAnalyzer(self);
        } catch (e) {
            throw e;
        }
    }
    postProcess() {
        this.largs.forEach(arg => arg.postProcess());
        this.rargs.forEach(arg => arg.postProcess());
    }
}

class LexicalAnalyser {
    constructor(ebnf, formulas) {
        this.ebnf = new ExtendedBackusNaurFormAnalyser(ebnf, formulas, false);
    }
    parse(str, entryPoint = 'expr'){
        const strObj = new StringObject(str);
        return this.ebnf.execution(strObj, entryPoint);
    }
}

const str2num = (str) => {
    const nstr = str.replace(/[\s+]/g, '').replace(/-+/, '-');
    return Number(nstr);
}

class Argument extends Operator {
    constructor(define){
        super(define);
    }
}

class Token extends Group {
    #formulas;
    get identifiers() {
        return this.serialize.reduce((acc, cur) => {
            if(cur instanceof Operator && cur.symbol === '|') {
                acc.push([]);
                return acc;
            }
            acc.slice(-1)[0].push(cur);
            return acc;
        }, [[]]);
    }
    getFormula(syntax) {
        return this.match(syntax)?.formula;
    }
    match(syntax) {
        return this.#formulas.find(formula => {
            const match = formula.match;
            if(typeof match === 'string' || match instanceof String) {
                const [s, e] = [match[0], match.slice(-1)[0]];
                if(s === '<' && e === '>') {
                    // 非終端文字1個指定の場合
                    const m = match.slice(1, -1);
                    const f = this.identifiers.find(identifer => {
                        if(identifer.length !== 1) {
                            return false;
                        }
                        if(!(identifer[0] instanceof NonTerminalSymbol)) {
                            return false;
                        }
                        return identifer[0].symbol === m;
                    });
                    return f;
                } else {
                    // 終端文字の場合
                    if(syntax.str !== match) {
                        return false;
                    }
                    const f = this.identifiers.find(identifer => {
                        if(identifer.length !== 1) {
                            return false;
                        }

                        if(!(identifer[0].constructor === Operand || identifer[0].constructor === CharSet)) {
                            // サブクラスは非終端文字ではないので除外
                            return false;
                        }
                        if(identifer[0].constructor === CharSet) {
                            return identifer[0].match(match);
                        } else {
                            return identifer[0].symbol === match;
                        }
                    });
                    return f;
                }
            } else if (match.constructor === Object) {
                if(match.nonTerminal !== undefined && match.nonTerminal !== this.assigned.symbol) {
                    return false;
                } 
                if(match.nonTerminal && Object.keys(match).length === 1) {
                    // nonTerminalしか指定がなければそれが合っていればOK
                    return true;
                }
                if(match.bnf !== undefined) {
                    if(this.identifiers.map(arr => arr.map(obj => obj.view).join('')).includes(match.bnf.trim())) {
                        return true;
                    }
                    return false;
                }
                if(match.bnfs !== undefined) {
                    for(const bnf of match.bnfs) {
                        if(this.identifiers.map(arr => arr.map(obj => obj.view).join('')).includes(bnf.trim())) {
                            return true;
                        }
                        return false;    
                    }
                }
                return false;
            }
        });
    }
    get assigned() {
        let assigned = this.root.largs[0];
        while(!(assigned instanceof NonTerminalSymbol)) {
            assigned = assigned.own[0];
        }
        return assigned;
    }
    execution(syntax) {
        const formula = this.getFormula(syntax);
        if(formula === undefined) {
            throw "Syntax define error" + syntax.bnfOperand;
        }
        return formula(syntax, ...syntax.brothers);
    }
    constructor(own, open, close, formulas) {
        super(own, open, close);
        this.#formulas = formulas;
    }
    get root() {
        let parent = this;
        while(parent.parent) {
            parent = parent.parent;
        }
        return parent;
    }
    get brothersParent() {
        const traceroute = [this];
        let parent = this;
        while(1) {
            parent = parent.parent;
            if(parent === undefined) {
                break;
            }
            traceroute.unshift(parent);
        }
        if(!(['=', '::='].includes(traceroute[0].own?.symbol))) {
            throw "ルート要素は必ず代入演算子のはずでは・・？";
        }
        if(traceroute[0].largs.includes(traceroute[1])) {
            //throw "代入式左側については今回考えない";
        }
        while(['=', '::=', '|'].includes(traceroute[1].own?.symbol)) {
            traceroute.shift();
        }
        return traceroute[0];
    }

    postProcess() {
        this.overWriteGenerateAnalyzer();
        super.postProcess();
    }
    overWriteGenerateAnalyzer() {
        const analyzer = super.generateAnalyzer;
        const brothersParent = this.brothersParent;
        const self = this;
        const org = brothersParent.generateAnalyzer;
        Object.defineProperty(brothersParent, 'generateAnalyzer', {
            get () {
                return (strObj, index) => {
                    const syntax = org(strObj, index);
                    if(syntax === undefined) {
                        return syntax;
                    }
                    const children = syntax.children;
                    // 今の実装ではカッコの中にトークン定義できないが、とりあえずそれで進める。
                    // カッコ内からみたカッコ外の扱いをうまく考えられない。
                    const found = children.find(syn => syn.bnfOperand === self);
                    if(found) {
                        const brothers = children; //.filter(syn => syn !== found);
                        found.brothers = brothers;
                    }
                    return syntax;
                }
            },
            configurable: true
        });
    }

    dummyExecuter(syntax) {
        /* 
        return: [
            {
                isCall: (caller, obj) => true/false,
                formula: (syntax, obj, ...brothers) => {},
            } , ...
        ]
        */
        return this.match(syntax)?.dummy || [];
    }
}

class Syntax {
    #bnfOperand;
    #brothers = [];
    constructor(string, bnfOperand, children) {
        this.str = string;
        this.#bnfOperand = bnfOperand;
        this.children = children;
    }
    set brother(val) {
        return this.#brothers.push(val);
    }
    set brothers(val) {
        while(this.#brothers.length){
            this.#brothers.pop();
        }
        for(const e of val) {
            this.brother = e;
        }
        return this.#brothers;
    }
    get arguments() {
        const args = {};
        const brothers = this.brothers.filter(arg => arg.bnfOperand instanceof Argument);
        brothers.forEach((br, index) => {
            const brother = br.children[0];
            args[index] = brother;
        });
        this.#brothers.forEach((br) => {
            const brother = (() => {
                if(br.bnfOperand instanceof Argument || br === this){
                    return br.children[0];
                }
                return br;
            })();
            const view = brother.bnfOperand.view;
            if(!(view in args)) {
                return args[view] = brother;
            }
            if(args[view].constructor === Array) {
                return args[view].push(brother);
            }
            args[view] = [args[view], brother];
        });
        return args;
    }
    get brothers() {
        return this.#brothers.filter(br => br !== this);
    }
    get length() {
        return this.str.length;
    }
    set bnfOperand(val) {
        return this.#bnfOperand = val;
    }
    get bnfOperand() {
        return this.#bnfOperand;
    }
    get dummyExecuter() {
        /* 
        executer: {
            isCall: (caller, obj) => true/false,
            formula: (caller, obj, ...args) => {},
        } 
        */
        if(this.#bnfOperand.dummyExecuter) {
            return this.#bnfOperand?.dummyExecuter(this);
        }
        return [];
    }
    dummyExecute(caller, obj) {
        this.children?.forEach(child => {
            child.dummyExecute(caller, obj);
        });
        this.dummyExecuter.filter(executer => executer.isCall(caller, obj)).forEach(executer => {    
            executer.formula(caller, obj, this, ...this.brothers);
        });
    }
    get value() {
        if(this.bnfOperand instanceof Token) {
            return this.bnfOperand.execution(this);
        } else if (this.children.length === 1) {
            return this.children[0].value;
        }
        const child = this.children.filter(child => child.bnfOperand instanceof Token);
        if (child.length === 1) {
            return child[0].value;
        } else if(child.length) {
            const values = child.map(c => c.value);
            return values.slice(-1)[0];
        }
        throw "ここに到達するということはトークンが適切に設定されていないはず・・"
    }
}

class Parser {
    constructor() {
        this.analyzer = new LexicalAnalyser(this.bnf, this.formulas);
    }
    get bnf() {
        return `
            e = ""
            w = \\s | \\s w
            white = w | e
            not_zero = '1-9'
            digit = '0' | not_zero
            digits = digit | digit digits
            integer = white '0' white | white int white
            int = not_zero digits*
            float = integer | white "0." digits white | white int '.' digits white
            sign = white '+' white | white '-' white | white '+' sign | white '-' sign
            <number> = [sign] (integer | float)
            expr = term | term <'+'|'-'> expr
            term = factor | factor <'*'|'/'> term
            factor = number | white '(' <expr> ')' white
        `;
    }
    get formulas() {
        return [
            {
                match:'<number>',
                formula: (self) => {
                    return str2num(self.str);
                }
            },
            {
                match:{
                    nonTerminal:'expr'
                },
                formula: (self) => {
                    const left = self.arguments.term.value;
                    const right = self.arguments.expr.value;
                    const symbol = self.str;
                    if(symbol === '+'){
                        return left + right;
                    }
                    return left - right;
                }
            },
            {
                match:{
                    nonTerminal:'term'
                },
                formula: (self) => {
                    const left = self.arguments.factor.value;
                    const right = self.arguments.term.value;
                    const symbol = self.str;
                    if(symbol === '*'){
                        return left * right;
                    }
                    return left / right;
                }
            },
            {
                match:{
                    nonTerminal:'factor'
                },
                formula: (self) => {
                    return self.arguments.expr.value;
                }
            },
        ];
    }
    parse(expr, entryPoint = 'expr') {
        const result = this.analyzer.parse(expr, entryPoint);
        return result;
    }
}

module.exports = {
    Parser,
    myconsole,
    NonTerminalSymbol
}
