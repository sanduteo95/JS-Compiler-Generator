let globalVariableStore = [];
let maxLoopUnrolling = 10;
let totallyUnrolled = false

function evaluate(program, functionApplication) {
    // set to default
    globalVariablesStore = [];
    totallyUnrolled = false;
    return evaluateProgram(program, functionApplication);
}

function evaluateProgram (program, functionApplication) {
    // check first if there are any global variables
    if (program[0] === 'New') {
        // evaluate the expression that signifies the value of the new variable
        globalVariableStore[program[1]] = evaluateExpression(program[2], globalVariableStore);
        // evaluate the rest of the body with the new variable
        return evaluateProgram(program[3], functionApplication);
    } else {
        return evaluateFunctions(program, 0, functionApplication, []);
    }
}

function evaluateFunctions (functionArray, index, functionApplication, functionStore) {
    // if there's nothing left in the program, we return undefined
    if (index === functionArray.length) {
        return evaluateApplication(functionApplication, [], functionStore);
    }

    const functionDefinition = functionArray[index];
    if (functionDefinition[0] === 'Function') {
        // the function store holds the name of the function, with its definition
        functionStore[functionDefinition[1]] = functionDefinition;
        return evaluateFunctions(functionArray, index + 1, functionApplication, functionStore);
    } else {
        throw new Error('Cannot perform partial evaluation on ' + functionDefinition[0]);
    }
}

function evaluateApplication(application, variableStore, functionStore) {
    // get the function definition from the store
    const functionDefinition = functionStore[application[1][1]];
    // check if function has been defined before 
    if (!functionDefinition) {
        return application;
    }

    // note that we don't need all the function parameters 
    const newVariableStore = [];
    for(let i = 0; i < application[2].length; i = i + 1) {
        // evaluate each parameter and save it
        newVariableStore[functionDefinition[2][i]] = evaluateExpression(application[2][i], variableStore, functionStore);
    }

    // calculate unused parameters and remove some arguments
    const unusedParameters = [];
    for(let i = application[2].length; i < functionDefinition[2].length; i = i + 1) {
        unusedParameters[i - application[2].length] = functionDefinition[2][i];
        newVariableStore[functionDefinition[2][i]] = [];
    }
 
    let newFunctionStore = []
    const functionNames = Object.keys(functionStore);
    for(let i = 0; i < functionNames.length; i = i + 1) {
        const name = functionNames[i];
        // the function name cannot coincide with a variable name
        if (!newVariableStore[name]) {
            newFunctionStore[name] = functionStore[name];
        }
        // stop when we see our current funciton name
        if (name === application[1][1]) {
            break;
        }
    }

    const evaluatedBody = evaluateBody(functionDefinition[3], newVariableStore, newFunctionStore);

    // check if the result is a constant and if so just return it
    if (evaluatedBody[0] === 'Const' || evaluatedBody[0] === 'Array' || evaluatedBody.length === 0) {
        return evaluatedBody;
    } else {
        // otherwise wrap it in the function call
        return ["Function", functionDefinition[1], unusedParameters, evaluatedBody];
    }
}

function reorderSequences (mainConstruct, appendedConstruct) {
    if (mainConstruct.length === 0) {
        return appendedConstruct;
    }
    if (mainConstruct[0] !== 'Sequence') {
        return ['Sequence', mainConstruct, appendedConstruct];
    }
    return  ['Sequence', mainConstruct[1], reorderSequences(mainConstruct[2], appendedConstruct)];
}

function evaluateBody(body, variableStore, functionStore) {
    if (body.length === 0) {
        return []; // to signify nothing to evaluate
    }

    switch(body[0]) {
        case 'Sequence':
            // evaluate the first (compulsory) statement
            const evaluatedStatement = body[1][0] === 'Let' ? evaluateBody(body[1], variableStore, functionStore) : evaluateStatement(body[1], variableStore, functionStore);

            if(evaluatedStatement[0] === 'Error') {
                return evaluatedStatement;
            } else {
                if (evaluatedStatement[0] === 'Const') {
                    return evaluatedStatement;
                }
            }

            // check if it has a body to evaluate after first statement
            if (body.length > 1) {
                // only evaluate body if we went through a loop (hence let), totally unrolled and aren't in the middle of an unrolling
                let evaluatedBody = []; 
                if (body[1][0] === 'Let') {
                    if (totallyUnrolled || maxLoopUnrolling !== 10) {
                        evaluatedBody = evaluateBody(body[2], variableStore, functionStore);
                    } else {
                        evaluatedBody = body[2];
                    }
                } else {
                    evaluatedBody = evaluateBody(body[2], variableStore, functionStore);
                }
                // otherwise just assign it to its old position and reorder sequence(sequence) formations
                return reorderSequences(evaluatedStatement, evaluatedBody);
            } else {
                // if statement was empty then there's nothing to evaluate
                if (evaluatedStatement.length === 0) {
                    return [];
                } else {
                    // otherwise replace the current body with the evaluated statement
                    return ["Sequence", evaluatedStatement, []];
                }
            }
        case 'New': case 'Let':
            // evaluate the expression that signifies the value of the new variable
            variableStore[body[1]] = evaluateExpression(body[2], variableStore, functionStore);;
            // evaluate the rest of the body with the new variable
            const evaluatedBody = evaluateBody(body[3], variableStore, functionStore);
            // check if we've evaluated everything in the body
            if (evaluatedBody.length === 0 || evaluatedBody[0] === 'Const' || evaluatedBody[0] === 'Operator' || evaluatedBody[0] === 'Array') {
                return evaluatedBody;
            } else {
                return [body[0], body[1], variableStore[body[1]], evaluatedBody];
            }
        case 'Loop':
            // evaluate condition and check if it it's a constant
            const evaluatedCondition = evaluateExpression(body[1], variableStore, functionStore);
            if (maxLoopUnrolling > 0 && evaluatedCondition[0] === 'Const') {
                const reorderedBody = ['Sequence', reorderSequences(body[2][1], body[2][2]), body];
                // decrement the loop unrolling to tell us we unrolled once
                maxLoopUnrolling = maxLoopUnrolling - 1;
                if (!evaluatedCondition[1]) {
                    // set the variable back to normal
                    maxLoopUnrolling = 10;
                    // set variable to true so we know we can replace variables from now on
                    totallyUnrolled = true;
                    // nothing to be done from this point on so return an empty
                    return [];
                } else {
                    // evaluate the reordered body with current variables and the loop as it is again
                    return evaluateBody(reorderedBody, variableStore, functionStore);
                }
            } else {
                // set the variable back to normal
                maxLoopUnrolling = 10;
                // can't risk changing anything in case the loop body changes the contents of variables
                return body;
            }
        default:
            return evaluateExpression(body, variableStore, functionStore);
    }
}

function evaluateStatement (statement, variableStore, functionStore) {
    switch(statement[0]) {
        case 'Assign': 
            // the left-hand side of an assignment can only be an identifier
            if (statement[1][0] === 'Identifier') {
                const evaluatedIdentifier = evaluateIdentifier(statement[1]);
                const evaluatedExpression = evaluateExpression(statement[2], variableStore, functionStore);
                if (variableStore[evaluatedIdentifier[1]]) {
                    variableStore[evaluatedIdentifier[1]] = evaluatedExpression;
                } else {
                    if (globalVariableStore[evaluatedIdentifier[1]]) {
                        globalVariableStore[evaluatedIdentifier[1]] = evaluatedExpression;
                    }
                }
                return []; // signify we don't need to return anything because we've already evaluated
            } else { 
                if (statement[1][0] === 'Index') {
                    const evaluatedIdentifier = evaluateIdentifier(statement[1][1], variableStore, functionStore);
                    const evaluatedExpression = evaluateExpression(statement[1][2], variableStore, functionStore);
                    if (evaluatedExpression[0] === 'Const') {
                        if (variableStore[evaluatedIdentifier[1]]) {
                            variableStore[evaluatedIdentifier[1]][evaluatedExpression[1]] = evaluateExpression(statement[2], variableStore, functionStore);
                        } else {
                            globalVariableStore[evaluatedIdentifier[1]][evaluatedExpression[1]] = evaluateExpression(statement[2], variableStore, functionStore);
                        }
                        return []; // signify we don't need to return anything because we've already evaluated
                    } else {
                        return ['Assign', ['Index', evaluatedIdentifier, evaluatedExpression], evaluateExpression(statement[2], variableStore, functionStore)];
                    }
                } else {
                    throw new Error('Can only assign to a variable or the index of an array');
                }
            }
        case 'Application':
            return evaluateApplication(statement, variableStore, functionStore);
        case 'Print':
            // do not actually print, just evaluate whatever needs printing
            return ["Print", evaluateExpression(statement[1], variableStore, functionStore)];
        case 'Error':
            // do not actually throw error, just evaluate whatever needs printing
            return ["Error", evaluateExpression(statement[1], variableStore, functionStore)];
        case 'If':
            const evaluatedExpression = evaluateExpression(statement[1], variableStore, functionStore);
            if (evaluatedExpression[0] === 'Const') {
                if (evaluatedExpression[1]) {
                    return evaluateBody(statement[2], variableStore, functionStore);
                } else {
                    return evaluateBody(statement[3], variableStore, functionStore);
                }
            } else {
                return ["If", evaluatedExpression, evaluateBody(statement[2], variableStore, functionStore), evaluateBody(statement[3], variableStore, functionStore)];
            }
        default:
            throw new Error('Cannot perform partial evaluation on ' + statement[0]);
    }
}

function evaluateExpression (expression, variableStore, functionStore) {
    switch(expression[0]) {
        case 'Application':
            return evaluateApplication(expression, variableStore, functionStore);
        case 'Deref':
            return evaluateDereference(expression, variableStore, functionStore);
        case 'Operator':
            return evaluateOperator(expression[1], variableStore, functionStore);
        case 'Const':
            return evaluateConstant(expression);
        case 'Array':
            let array = [];
            let hasNonConstants = false;
            for(let i = 0;i < expression[1].length; i = i + 1) {
                array[i] = evaluateExpression(expression[1][i], variableStore, functionStore);
                if (array[i][0] !== 'Const') {
                    hasNonConstants = true;
                }
            }
            if (!hasNonConstants) {
                return array;
            } else {
                return ['Array', array];
            }
        case 'Length':
            const evaluatedIdentifierLength = evaluateIdentifier(expression[1], variableStore);
            // check if we have the value, and return its length if so
            if (!variableStore[evaluatedIdentifierLength[1]] && !globalVariableStore[evaluatedIdentifierLength[1]]) {
                return expression;
            } else {
                return ['Const', variableStore[evaluatedIdentifierLength[1]].length || globalVariableStore[evaluatedIdentifierLength[1]].length];
            }
        case 'Keys':
            const evaluatedIdentifierKeys = evaluateIdentifier(expression[1], variableStore);
            if (!variableStore[evaluatedIdentifierKeys[1]] && !globalVariableStore[evaluatedIdentifierLength[1]]) {
                return expression;
            } else {
                return ['Array', Object.keys(variableStore[evaluatedIdentifierKeys[1]] || globalVariableStore[evaluatedIdentifierLength[1]])];
            }
        default:
            throw new Error('Cannot perform partial evaluation on ' + expression[0]);
    }
}

function evaluateIdentifier(identifier) {
    // just return the identifier
    return identifier;
}

function evaluateDereference(dereference, variableStore, functionStore) {
    let evaluatedIdentifier = [];
    // get the identifier being dereferenced
    if (dereference[1][0] === 'Index') {
        evaluatedIdentifier = evaluateIdentifier(dereference[1][1], variableStore);
        const evaluatedExpression = evaluateExpression(dereference[1][2], variableStore, functionStore);
        if (evaluatedExpression[0] === 'Const') {
            return variableStore[evaluatedIdentifier[1]][evaluatedExpression[1]] || globalVariableStore[evaluatedIdentifier[1]][evaluatedExpression[1]];
        } else {
            return ['Index', evaluatedIdentifier, evaluatedExpression];
        }
    } else {
        evaluatedIdentifier = evaluateIdentifier(dereference[1]);
        // check if we have the value, and return it if so
        if (!variableStore[evaluatedIdentifier[1]] && !globalVariableStore[evaluatedIdentifier[1]]) {
            return dereference;
        } else {
            return variableStore[evaluatedIdentifier[1]] || globalVariableStore[evaluatedIdentifier[1]];
        }
    }
}

function evaluateConstant(constant) {
    return constant;
}

function evaluateOperator(operator, variableStore, functionStore) {
    let result1 = [];
    let result2 = [];
    result1 = evaluateExpression(operator[1], variableStore, functionStore);
    if (operator[0] !== 'Negate' && operator[0] !== 'Negative') {
        // if we can be lazy and the first argument is a constant, then return the result directly
        if((operator[0] === 'Or' && result1[0] === 'Const' && result1[1]) ||
            (operator[0] === 'And' && result1[0] === 'Const' && !result1[1])) {
            return result1;
        }
        result2 = evaluateExpression(operator[2], variableStore, functionStore);

        // again we can be lazy
        if((operator[0] === 'Or' && result1[0] === 'Const' && !result1[1]) ||
            (operator[0] === 'And' && result1[0] === 'Const' && reslt1[1])) {
            return result2;
        }

        // if the two expression are constants, we can return a constant by applying the operator
        if(result1[0] === 'Const' && result2[0] === 'Const') {
            switch(operator[0]) {
                case 'Plus':   
                    return ["Const", result1[1] + result2[1]];
                case 'Minus':
                    return ["Const", result1[1] - result2[1]];
                case 'Times':
                    return ["Const", result1[1] * result2[1]];
                case 'Divide':
                    return ["Const", result1[1] / result2[1]];
                case 'Modulus':
                    return ["Const", result1[1] % result2[1]];
                case 'Eq':
                    return ["Const", result1[1] == result2[1]];
                case 'Noteq':
                    return ["Const", result1[1] != result2[1]];
                case 'StrictEq':
                    return ["Const", result1[1] === result2[1]];
                case 'StrictNoteq':
                    return ["Const", result1[1] !== result2[1]];
                case 'Leq':
                    return ["Const", result1[1] <= result2[1]];
                case 'Less':
                    return ["Const", result1[1] < result2[1]];
                case 'Geq':
                    return ["Const", result1[1] >= result2[1]];
                case 'Greater':
                    return ["Const", result1[1] > result2[1]];
                default:
                    throw new Error('Cannot perform partial evaluation on ' + operator[0]);
            }
        } else {
            if ((operator[0] === 'Plus' && result1[0] === 'Const' && result1[1] === 0) ||
                (operator[0] === 'Times' && result1[0] === 'Const' && result1[1] === 1)) {
                return result2;
            } else {
                if (((operator[0] === 'Plus' || operator[0] === 'Minus') && result2[0] === 'Const' && result2[1] === 0) ||
                    ((operator[0] === 'Times' || operator[0] === 'Divide') && result2[0] === 'Const' && result2[1] === 1)) {
                    return result1;
                }
            }
            // otherwise, replace the 2nd and third argument of the operator with the optimised expressions
            return ["Operator", [operator[0], result1, result2]];
        }
    } else {
        if (result1[0] === 'Const') {
            switch(operator[0]) {
                case 'Negate':
                    return ["Const", !result1[1]];
                case 'Negative':
                    return ["Const", -result1[1]];
                default:
                    throw new Error('Cannot perform partial evaluation on ' + operator[0]);
            }
        } else {
            return ["Operator", [operator[0], result1]];
        }
    }
}

module.exports = {
    evaluate: evaluate
}