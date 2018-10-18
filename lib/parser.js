var Parser = require("jison").Parser;

// the grammar for the parser
const grammar = {
    "operators": [
        ["left", "and", "or"],
        ["left", "strict_eq", "strict_noteq", "eq", "noteq"],
        ["left", "leq", "geq", "less", "greater"],
        ["left", "plus", "minus"],
        ["left", "times", "divide", "modulus"],
        ["right", "negate"]
    ],
    "bnf": {
        "file": [
            // TODO: why is there EOF sometimes, sometimes not
            [ "program EOF",                        "return $program"],
            [ "program",                        "return $program"],
            [ "func_appl EOF",                          "return $func_appl;" ],
            [ "func_appl",                          "return $func_appl;" ]
        ],
        "program": [
            [ "type name = expression ; program",    "$$ = [\"New\", $name, $expression, $program];" ],
            [ "func_list",                          "$$ = $func_list;" ]
        ],
        "func_appl": [
            [ "var ( args )",                      "$$ = [\"Application\", $var, $args];" ]
        ],
        "func_list": [
            [ "func",                               "$$ = [$func]" ],
            [ "func func_list",                     "$$ = [$func].concat($func_list);" ]
        ],
        "func": [
            [ "function name ( params ) { body }",    "$$ = [\"Function\", $name, $params, $body];" ],
        ],
        "name": [
            [ "id",                                 "$$ = yytext;" ]
        ],
        "var": [
            [ "id",                                 "$$ = [\"Identifier\", yytext];" ]
        ],
        "params": [
            [ "",                                   "$$ = [];"],
            [ "name",                               "$$ = [$name];" ],
            [ "name , params",                       "$$ = [$name].concat($params);" ]
        ],
        "body": [
            [ "",                                   "$$ = [];"],
            [ "comment body",                       "$$ = $body;" ],
            [ "statement ; body",                   "$$ = [\"Sequence\", $statement, $body];" ],
            [ "type name = expression ; body",        "$$ = [\"New\", $name, $expression, $body];"],
            [ "if ( expression ) { body } body",            "$$ = [\"Sequence\", [\"If\", $expression, $6, []], $8];" ],
            [ "if ( expression ) { body } else { body } body",      "$$ = [\"Sequence\", [\"If\", $expression, $6, $10], $12];" ],
            [ "for ( type name = expression ; bool_op_exp ; statement ) { body } body ", "$$ = [\"Sequence\", [\"Let\", $name, $expression, [\"Loop\", $bool_op_exp, [\"Sequence\", $13, $statement]]], $15];" ],
            [ "return expression ; body",                  "$$ = $expression;" ]    
        ],
        "statement": [
            [ "var = expression",                    "$$ = [\"Assign\", $var, $expression];" ],
            [ "var [ expression ] = expression",        "$$ = [\"Assign\", [\"Index\", $var, $3], $6];" ],
            [ "func_appl",                          "$$ = $func_appl;" ],
            [ "print ( expression )",              "$$ = [\"Print\", $expression];" ],
            [ "error ( expression )",              "$$ = [\"Error\", $expression];" ]
        ],
        "expression": [
            [ "func_appl",                          "$$ = $func_appl;" ],
            [ "var",                                 "$$ = [\"Deref\", $var];" ],
            [ "op_exp",                             "$$ = $op_exp;" ],
            [ "const",                              "$$ = [\"Const\", yytext];" ],
            [ "[ args ]",                           "$$ = [\"Array\", $args];" ],
            [ "var .length",                       "$$ = [\"Length\", $var];" ],
            [ "var [ expression ]",                 "$$ = [\"Deref\", [\"Index\", $var, $expression]];" ],
            [ "Object.keys ( var )",                "$$ = [\"Keys\", $var];" ]
        ],
        "args": [
            [ "",                                   "$$ = [];"],
            [ "expression",                         "$$ = [$expression];"],
            [ "expression , args",                  "$$ = [$expression].concat($args);" ]
        ],
        "op_exp": [
            [ "( expression )",                     "$$ = $expression;" ],
            [ "untyped_op_exp",                         "$$ = $untyped_op_exp;" ],
            [ "bool_op_exp",                            "$$ = $bool_op_exp;" ]
        ],
        "untyped_op_exp": [
            [ "expression plus expression",            "$$ = [\"Operator\", [\"Plus\", $1, $3]];"],
            [ "expression minus expression",            "$$ = [\"Operator\", [\"Minus\", $1, $3]];" ],
            [ "expression times expression",            "$$ = [\"Operator\", [\"Times\", $1, $3]];" ],
            [ "expression divide expression",            "$$ = [\"Operator\", [\"Divide\", $1, $3]];" ],
            [ "expression modulus expression",            "$$ = [\"Operator\", [\"Modulus\", $1, $3]];" ],
            [ "minus expression",                        "$$ = [\"Operator\", [\"Negative\", $expression]];" ]
        ],
        "bool_op_exp": [
            [ "expression leq expression",           "$$ = [\"Operator\", [\"Leq\", $1, $3]];" ],
            [ "expression less expression",            "$$ = [\"Operator\", [\"Less\", $1, $3]];" ],
            [ "expression geq expression",           "$$ = [\"Operator\", [\"Geq\", $1, $3]];" ],
            [ "expression greater expression",            "$$ = [\"Operator\", [\"Greater\", $1, $3]];" ],
            [ "expression eq expression",           "$$ = [\"Operator\", [\"Eq\", $1, $3]];" ],
            [ "expression noteq expression",           "$$ = [\"Operator\", [\"Noteq\", $1, $3]];" ],
            [ "expression strict_eq expression",           "$$ = [\"Operator\", [\"StrictEq\", $1, $3]];" ],
            [ "expression strict_noteq expression",          "$$ = [\"Operator\", [\"StrictNoteq\", $1, $3]];" ],
            [ "expression and expression",           "$$ = [\"Operator\", [\"And\", $1, $3]];" ],
            [ "expression or expression",           "$$ = [\"Operator\", [\"Or\", $1, $3]];" ],
            [ "negate expression",                       "$$ = [\"Operator\", [\"Negate\", $expression]];" ]
        ]
    }
};

const parser = new Parser(grammar);

const JSLexer = require("./lexer.js");
const jsLexer = new JSLexer();
// initialise the lexer
jsLexer.initialiseLexer();

parser.lexer = jsLexer.lexer;

module.exports = parser;
