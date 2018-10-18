// import lexical analyser
const Lexer = require("lex");

// rules for lexical analysis
const lexerRules = {
    // match blank spaces, tabs and newlines - they don't need to be tokenised
    "[ \\t]+": () => undefined,
    "\\n": () => undefined,
    // match structure-related syntax without tokenisation (the parser recognises them as is)
    "(\\(|\\)|\\{|\\}|\\,|\\;|\\=|function|return|if|else|for|break)": lexeme => {
        return {token: lexeme};
    },
    // match any integer or boolean
    "[0-9]+": lexeme => {
        return {token: "const", value: parseInt(lexeme)};
    },
    "(true|false)": lexeme => {
        return {token: "const", value: lexeme == 'true'};
    },
    // match arrays
    "(\\[|\\]|\\.length|Object.keys)" : lexeme => {
        return {token: lexeme};
    },
    "\\+": () => {
        return {token: "plus"};
    },
    "\\-": () => {
        return {token: "minus"};
    },
    "\\*": () => {
        return {token: "times"};
    },
    "\\/": () => {
        return {token: "divide"};
    },
    "\\%": () => {
        return {token: "modulus"};
    },
    "\\<": () => {
        return {token: "less"};
    },
    "\\<\\=": () => {
        return {token: "leq"};
    },
    "\\>": () => {
        return {token: "greater"};
    },
    "\\>\\=": () => {
        return {token: "geq"};
    },
    "\\=\\=": () => {
        return {token: "eq"};
    },
    "\\=\\=\\=": () => {
        return {token: "strict_eq"};
    },
    "\\!\\=": () => {
        return {token: "noteq"};
    },
    "\\!\\=\\=": () => {
        return {token: "strict_noteq"};
    },
    "\\&\\&": () => {
        return {token: "and"};
    },
    "\\|\\|": () => {
        return {token: "or"};
    },
    "\\!": () => {
        return {token: "negate"};
    },
    // match type of variable (TODO: differentiae between types)
    "(var|let|const)": lexeme => {
        return {token: "type", value: lexeme};
    },
    // match any variable/function name
    "[A-Za-z0-9]+": lexeme => {
        return {token: "id", value: lexeme};
    },
    // match a string
    "(\"[^\"]*\"|\'[^\']*\')": lexeme => {
        return {token: "const", value: lexeme.substring(1, lexeme.length - 1)};
    },
    // match printing syntax
    "console.log": lexeme => {
        return {token: "print", value: lexeme};
    },
    // match error throwing syntax
    "throw new Error": () => {
        return {token: "error"};
    },
    "(\\/\\*[\\w\\'\\s\\r\\n\\*]*\\*\\/)|(\\/\\/[\\w\\t \\']*)": () => {
        return {token: "comment"};
    },
    // match the end of string
    "\$": () => {
        return {token: "EOF"};
    }
}

class JSLexer {
    constructor () {
        this.row = 1;
        this.col = 1;
        this.lexer = new Lexer(char => {
            throw new Error("Unexpected character at row " + this.row + ", col " + this.col + ": " + char);
        });        
    }

    // Sets up the lexical analyser with the given rules and globally defined standard functions
    initialiseLexer () {
        const self = this;

        Object.keys(lexerRules).map(stringifiedRegex => {
            const regex = new RegExp(stringifiedRegex);
            self.lexer.addRule(regex, lexeme => {
                // update the column and row
                if (/\n/.test(lexeme)) {
                    self.row ++;
                    self.col = 1;
                } else {
                    self.col += lexeme.length;
                }
                // self.lexer.yyleng = self.col;
                self.lexer.yylineno = self.row;
                // get the token and value if they exist
                const analysedSyntax = lexerRules[stringifiedRegex](lexeme);
                if (analysedSyntax) {
                    // store the row and column in case we want to use to personalise errors
                    if (analysedSyntax.hasOwnProperty('value')) {
                        self.lexer.yytext = analysedSyntax.value;
                    }
                    if (analysedSyntax.hasOwnProperty('token')) {
                        return analysedSyntax.token;
                    } 
                }  
            });
        });
    }
}

module.exports = JSLexer