const fs = require("fs");
const path = require("path");

const parser = require("./lib/parser.js");
const test = require("./test.js");
const interpreter = require("./lib/interpreter.js");
const evaluator = require("./lib/evaluator.js");

function createParseTree(input) {
    return parser.parse(input)
}

let incorrectCount = 0;
function interpret(testCase, isTesting) {
    const programParseTree = createParseTree(testCase.program);
    const functionApplicationParseTree = createParseTree(testCase.functionApplication);
    
    if (isTesting) {
        if (testCase.expected === 'error') {
            try {
                interpreter.interpret(programParseTree, functionApplicationParseTree);
                console.log("       INCORRECT");
                incorrectCount++;
            } catch {
                console.log("       CORRECT");
            }
        } else {
            const result = interpreter.interpret(programParseTree, functionApplicationParseTree);
            console.log("   Result is: " + result);
            if(Array.isArray(testCase.expected)) {
                if (testCase.expected.length !== result.length) {
                    console.log("       INCORRECT");
                    incorrectCount++;
                } else {
                    for(let i = 0;i < testCase.expected.length; i = i + 1) {
                        if (testCase.expected[i] !== result[i]) {
                            console.log("       INCORRECT");
                            incorrectCount++;
                            break;
                        }
                    }
                    console.log("       CORRECT");
                }
            } else {
                if (result === testCase.expected) {
                    console.log("       CORRECT");
                } else {
                    console.log("       INCORRECT");
                    incorrectCount++;
                }
            }
        }
    } else {
        const result = interpreter.interpret(programParseTree, functionApplicationParseTree);
        console.log("   Result is: " + result);
    }
}

function testInterpreter() {
    incorrectCount = 0;

    for(testName in test) {
        console.log("***TEST: " + testName);
        interpret(test[testName], true);
    }

    console.log("\n===\n")
    if (incorrectCount !== 0) {
        console.log("This many tests failed: " + incorrectCount);
    } else {
        console.log("All tests passed");
    }
}

function evaluate(testCase, isTesting) {
    const programParseTree = createParseTree(testCase.program);
    const functionApplicationParseTree = createParseTree(testCase.functionApplication);

    let result = evaluator.evaluate(programParseTree, functionApplicationParseTree);

    if (isTesting) {
        if (testCase.expected === 'error') {
            console.log("   Result is: " + JSON.stringify(result));
            if (result[0] !== 'Const') {
                console.log("       CORRECT (MAYBE)");
            } else {
                console.log("       INCORRECT");
                incorrectCount++;
            }  
        } else {
            console.log("   Result is: " + JSON.stringify(result));
            if (Array.isArray(testCase.expected)) {
                if (testCase.expected.length !== result[1].length) {
                    console.log("       INCORRECT");
                    incorrectCount++;
                } else {
                    for(let i = 0;i < testCase.expected.length; i = i + 1) {
                        if (testCase.expected[i] !== result[1][i]) {
                            console.log("       INCORRECT");
                            incorrectCount++;
                            break;
                        }
                    }
                    console.log("       CORRECT");
                }
            } else {
                if ((!result && !testCase.expected) || result[1] === testCase.expected) {
                    console.log("       CORRECT");
                } else {
                    console.log("       INCORRECT");
                    incorrectCount++;
                }
            }
        }
    } else {
        console.log("   Result is: " + JSON.stringify(result));
    }
}

function testEvaluator() {
    incorrectCount = 0;

    for(testName in test) {
        console.log("***TEST: " + testName);
        evaluate(test[testName], true);
    }
    console.log("===")
    if (incorrectCount !== 0) {
        console.log("This many tests failed: " + incorrectCount);
    } else {
        console.log("All tests passed");
    }
}

// one argument tells us whether to interpret or evaluate
// the other one what file to run it on
if (process.argv.length < 3) {
    throw new Error('Function not called with enough aguments: ' + process.args.length + ' instead of at least' + 3);
} else {
    switch(process.argv[2]) {
        case '-f1':
            const interpreterProgram = require('./output.json');
            const program = test.simpleFunctionCallWithReturn.program;
            const functionApplication = test.simpleFunctionCallWithReturn.functionApplication;
            const interpreterFunctionApplication = ['Application', ['Identifier', 'interpret'], [createParseTree(program), createParseTree(functionApplication)]];
            
            let result = evaluator.evaluate(interpreterProgram, interpreterFunctionApplication);
            console.log(JSON.stringify(result));
            break;
        case '-p':
            if (process.argv.length !== 4) {
                throw new Error('This command requires a fourth argument for the file name');
            }

            fs.readFile(path.join(__dirname, process.argv[3]), {encoding: 'utf-8'}, function (err, data){
                if (!err) {
                    console.log(JSON.stringify(createParseTree(data, null, 2)));
                } else {
                    throw new Error(err);
                }
            });
            break;
        case '-i':
            if (process.argv.length !== 5) {
                throw new Error('This command requires a fourth and fifth argument for the file name');
            }

            fs.readFile(path.join(__dirname, process.argv[3]), {encoding: 'utf-8'}, function (err, data){
                if (!err) {
                    interpret({
                        program: data,
                        functionApplication: process.argv[4],
                        expected: undefined
                    }, false);
                } else {
                    throw new Error(err);
                }
            });
            break;
        case '-e':
            if (process.argv.length !== 5) {
                throw new Error('This command requires a fourth and fifth argument for the file name');
            }
            fs.readFile(path.join(__dirname, process.argv[3]), {encoding: 'utf-8'}, function (err, data){
                if (!err) {
                    evaluate({
                        program: data,
                        functionApplication: process.argv[4],
                        expected: undefined
                    }, false);
                } else {
                    throw new Error(err);
                }
            });
            break;
        case '-ti':
            testInterpreter();
            break;
        case '-te':
            testEvaluator();
            break;
        default:
            throw new Error('Only allowed to interpret and evaluate for now')
    }
}