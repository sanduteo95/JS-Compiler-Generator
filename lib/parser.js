var Parser = require("jison").Parser;

// the grammar for the parser
const grammar = {
    "operators": [
        ["left", "length"],
        ["left", "and", "or"],
        ["left", "strict_eq", "strict_noteq", "eq", "noteq"],
        ["left", "leq", "geq", "less", "greater"],
        ["left", "plus", "minus"],
        ["left", "times", "divide", "modulus"],
        ["right", "negate"]
    ],
    "bnf": {
        "code": [
            // TODO: why is there EOF sometimes, sometimes not
            [ "func_appl EOF",                                                                  "return $func_appl;" ],
            [ "func_appl",                                                                      "return $func_appl;" ],
            [ "program EOF",                                                                    "return $program"],
            [ "program ",                                                                       "return $program"]
        ],
        // the function application has the function identifier and function arguments
        "func_appl": [
            [ "var ( args )",                                                                   "$$ = [\"Application\", $var, $args];" ]
        ],
        // athevariable gets parsed to an identifier with that value (used for already declared values)
        "var": [
            [ "id",                                                                             "$$ = [\"Identifier\", yytext];" ]
        ],
        // the program consists of the program content and, possibly, its exports
        "program": [
            [ "content module.exports = { exports }",                                           "$$ = [\"Export\", $exports, $content];" ],
            [ "content",                                                                        "$$ = $content;" ]
        ],
        // the program exports are a string separated list of names
        "exports": [
            [ "",                                                                               "$$ = [];" ],
            [ "name : name",                                                                    "$$ = [$name];" ],
            [ "name : name , exports",                                                          "$$ = [$name].concat($exports);" ]
        ],
        // the program content consists of global variables and a list of functions
        "content": [
            [ "type name = expression ; content",                                               "$$ = [\"New\", $name, $expression, $content];" ],
            [ "func_list",                                                                      "$$ = $func_list;" ]
        ],
        // the list of functions contains at least one function
        "func_list": [
            [ "func",                                                                           "$$ = [$func]" ],
            [ "func func_list",                                                                 "$$ = [$func].concat($func_list);" ]
        ],
        // the function is a definition consisting of a name, parameters and a function body
        "func": [
            [ "function name ( params ) { body }",                                              "$$ = [\"Function\", $name, $params, $body];" ],
        ],
        // the name gets parsed to its value (used for declaring variables/functions)
        "name": [
            [ "id",                                                                             "$$ = yytext;" ]
        ],
        // the parameters are a comma-separated list of names
        "params": [
            [ "",                                                                               "$$ = [];"],
            [ "name",                                                                           "$$ = [$name];" ],
            [ "name , params",                                                                  "$$ = [$name].concat($params);" ]
        ],
        // the body contains more complex structures
        "body": [
            [ "",                                                                               "$$ = [];"],
            [ "comment body",                                                                   "$$ = $body;" ], // ignore the comments
            [ "statement ; body",                                                               "$$ = ($body.length === 0) ? $statement : [\"Sequence\", $statement, $body];" ], // statements separated by commas form sequences
            [ "type name = expression ; body",                                                  "$$ = [\"New\", $name, $expression, $body];"],
            [ "if ( expression ) { body } body",                                                "$$ = [\"Sequence\", [\"If\", $expression, $6, []], $8];" ],
            [ "if ( expression ) { body } else { body } body",                                  "$$ = [\"Sequence\", [\"If\", $expression, $6, $10], $12];" ],
            [ "for ( type name = expression ; bool_op_exp ; statement ) { body } body ",        "$$ = [\"Sequence\", [\"Let\", $name, $expression, [\"Loop\", $bool_op_exp, [\"Sequence\", $13, $statement]]], $15];" ],
            [ "switch ( expression ) { cases } body",                                           "$$ = [\"Sequence\", [\"Switch\", $expression, $cases], $body];" ]
    
        ],
        // the cases are lists of complex structures
        "cases": [
            [ "default : body",                                                                 "$$ = [[\"Default\", $body]];" ],
            [ "case expression : body cases",                                                   "$$ = [[\"Case\", $expression, $body]].concat($cases);" ]
        ],
        // the statement represents a one-liner construct (usually followed by a comma and does not affect the rest of the body)
        "statement": [
            [ "variable = expression",                                                          "$$ = [\"Assign\", $variable, $expression];" ],
            [ "print ( expression )",                                                           "$$ = [\"Print\", $expression];" ],
            [ "error ( expression )",                                                           "$$ = [\"Error\", $expression];" ],
            [ "return expression",                                                              "$$ = [\"Return\", $expression];" ],
            [ "break",                                                                          "$$ = [\"Break\"];" ],
            [ "expression",                                                                     "$$ = $expression;" ]
        ],
        // the expression is something that can get evaluated to a constant usually
        "expression": [
            [ "func_appl",                                                                      "$$ = $func_appl;" ],
            [ "variable",                                                                       "$$ = [\"Deref\", $variable];" ],
            [ "op_exp",                                                                         "$$ = $op_exp;" ],
            [ "const",                                                                          "$$ = [\"Const\", yytext];" ],
            [ "[ args ]",                                                                       "$$ = [\"Array\", $args];" ],
            // TODO: expressions for the next two?
            [ "variable length",                                                             "$$ = [\"Length\", [\"Deref\", $variable]];" ],
            [ "keys ( variable )",                                                            "$$ = [\"Keys\", [\"Deref\", $variable]];" ]
        ],
        "variable": [
            [ "var",                                                                            "$$ = $var;" ],
            [ "var index",                                                                      "$$ = [\"Index\", $var, $index];" ],
        ],
        "index": [
            [ "[ expression ]",                                                                 "$$ = [$expression];" ],
            [ "[ expression ] index",                                                           "$$ = [$expression].concat($index);" ]
        ],
        // the arguments are a comma-separated list of expressions
        "args": [
            [ "",                                                                               "$$ = [];"],
            [ "expression",                                                                     "$$ = [$expression];"],
            [ "expression , args",                                                              "$$ = [$expression].concat($args);" ]
        ],
        // the operator expressions consists of untypes and boolean operator expressions
        "op_exp": [
            [ "( expression )",                                                                 "$$ = $expression;" ],
            [ "untyped_op_exp",                                                                 "$$ = $untyped_op_exp;" ],
            [ "bool_op_exp",                                                                    "$$ = $bool_op_exp;" ]
        ],
        // the untyped operator expression returns untyped values (meaning could be integer, boolean and string)
        "untyped_op_exp": [
            [ "expression plus expression",                                                     "$$ = [\"Operator\", [\"Plus\", $1, $3]];"],
            [ "expression minus expression",                                                    "$$ = [\"Operator\", [\"Minus\", $1, $3]];" ],
            [ "expression times expression",                                                    "$$ = [\"Operator\", [\"Times\", $1, $3]];" ],
            [ "expression divide expression",                                                   "$$ = [\"Operator\", [\"Divide\", $1, $3]];" ],
            [ "expression modulus expression",                                                  "$$ = [\"Operator\", [\"Modulus\", $1, $3]];" ],
            [ "minus expression",                                                               "$$ = [\"Operator\", [\"Negative\", $expression]];" ]
        ],
        // the bolen opearotor expression returns boolean expressions
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

// create the parser for the defined grammar
const parser = new Parser(grammar);

const JSLexer = require("./lexer.js");
const jsLexer = new JSLexer();
// initialise the lexer
jsLexer.initialiseLexer();

parser.lexer = jsLexer.lexer;

module.exports = parser;
