let globalVariableStore = [];
let maxLoopUnrolling = 10;
let totallyUnrolled = false;
let usedVariables = [];

function evaluate(program, functionApplication) {
    // set to default
    globalVariableStore = [];
    totallyUnrolled = false;
    usedVariables = [];
    return evaluateProgram(program, functionApplication);
}

function fullyEvaluated (expression) {
    return expression[0] === 'Return' && (expression[1][0] === 'Const' || expression[1][0] === 'Array');
}

function evaluateProgram (program, functionApplication) {
    if (program[0] === 'Export') {
        // check first if the function is in
        for (let i=0; i < program[1].length; i = i + 1) {
            if (program[1][i] === functionApplication[1][1]) {
                // if we have found it, then we can continue evaluating the content directly
                let evaluatedExportContent = evaluateContent(program[2], functionApplication);
                if (evaluatedExportContent.length === 1 && (evaluatedExportContent[0].length === 0 || fullyEvaluated(evaluatedExportContent[0]))) {
                    return evaluatedExportContent[0][1];
                } else {
                    return ['Export', program[1], evaluatedExportContent];
                }
            }
        }
        // if we haven't found it then we return the program as it is
        return program;
    } else {
        let evaluatedContent = evaluateContent(program, functionApplication);
        if (evaluatedContent.length === 1 && (evaluatedContent[0].length === 0 || fullyEvaluated(evaluatedContent[0]))) {
            return evaluatedContent[0][1];
        } else {
            return evaluatedContent;
        }
    }
}

function evaluateVariableDeclaration (variableDeclaration, variableStore, functionStore, functionApplication) {
    // evaluate the expression that signifies the value of the new variable
    let evaluatedExpression = evaluateExpression(variableDeclaration[2], variableStore, functionStore);

    // if it's anything but a return then make a sequence
    let bodyToEvaluate = [];
    if (evaluatedExpression[0] === 'Return') {
        variableStore[variableDeclaration[1]] = evaluatedExpression[1];
        bodyToEvaluate = variableDeclaration[3];
    } else {
        if (evaluatedExpression[0] === 'Const' || evaluatedExpression[0] === 'Array' || evaluatedExpression[0] === 'Length' || evaluatedExpression[0] === 'Keys' || evaluatedExpression[0] === 'Derefer') {
            variableStore[variableDeclaration[1]] = evaluatedExpression;
            bodyToEvaluate = variableDeclaration[3];
        } else {
            variableStore[variableDeclaration[1]] = ['Const', null];
            if (evaluatedExpression[0] === 'Sequence' && evaluatedExpression[1][0] === 'Let') {
                // if it's a let, leave it 
                bodyToEvaluate = ['Sequence', evaluatedExpression[1], reorderSequences(evaluatedExpression[2], variableDeclaration[3])];
            } else {
                bodyToEvaluate = reorderSequences(evaluatedExpression, variableDeclaration[3]);
            }
        }
    }
    // evaluate the rest of the body with the new variable
    let evaluatedBody = [];
    if (!functionApplication) {
        evaluatedBody = evaluateBody(bodyToEvaluate, variableStore, functionStore);
        // check if we've evaluated everything in the body of the function
        // or if the variable is not used
        if (evaluatedBody.length === 0 || fullyEvaluated(evaluatedBody) || (usedVariables[variableDeclaration[0]] && !JSON.stringify(evaluatedBody).includes("[\"Identifier\",\"" + variableDeclaration[1] + "\"]"))) {
            return evaluatedBody;
        } else {
            return [variableDeclaration[0], variableDeclaration[1], variableStore[variableDeclaration[1]], evaluatedBody];
        }
    } else {
        // check if we've evaluated everything in the body of the program
        // or if the variable is not used
        evaluatedBody = evaluateContent(bodyToEvaluate, functionApplication);
        if (evaluatedBody.length === 1 && fullyEvaluated(evaluatedBody[0]) || (usedVariables[variableDeclaration[0]] && !JSON.stringify(evaluatedBody[0]).includes("[\"Identifier\",\"" + variableDeclaration[1] + "\"]"))) {
            return evaluatedBody;
        } else {
            return [variableDeclaration[0], variableDeclaration[1], variableStore[variableDeclaration[1]], evaluatedBody];
        }
    }
}

function evaluateContent (content, functionApplication) {
    // check first if there are any global variables
    if (content[0] === 'New') {
        return evaluateVariableDeclaration(content, globalVariableStore, [], functionApplication);
    } else {
        return evaluateFunctions(content, functionApplication, []);
    }
}

function evaluateFunctions (functionArray, functionApplication, functionStore) {
    let evaluatedFunctions = [];
    let index = 0; // the index of the function that will be called
    for (let i = 0; i < functionArray.length; i = i + 1) {
        const functionDefinition = functionArray[i];
        evaluatedFunctions[i] = functionDefinition;
        evaluatedFunctions[i] = functionDefinition;
        if (functionDefinition[0] === 'Function') {
            functionStore[functionDefinition[1]] = functionDefinition;
            if (functionDefinition[1] === functionApplication[1][1]) {
                index = i;
            }
        } else {
            throw new Error('Cannot perform partial evaluation on ' + functionDefinition[0]);
        }
    }
    // if there's nothing left in the program, we return undefined
    const evaluatedApplication = evaluateApplication(functionApplication, [], functionStore);

    if (evaluatedApplication.length === 0 || fullyEvaluated(evaluatedApplication)) {
        return [evaluatedApplication];
    } else {
        evaluatedFunctions[index] = ['Function', functionApplication[1][1], [], evaluatedApplication];
        return evaluatedFunctions;
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
        newVariableStore[functionDefinition[2][i]] = ['Deref', ['Identifier', functionDefinition[2][i]]];
    }
 
    let newFunctionStore = []
    const functionNames = Object.keys(functionStore);
    for(let i = 0; i < functionNames.length; i = i + 1) {
        const name = functionNames[i];
        // the function name cannot coincide with a variable name
        if (!newVariableStore[name]) {
            newFunctionStore[name] = functionStore[name];
        }
    }
    return evaluateBody(functionDefinition[3], newVariableStore, newFunctionStore);;
}

function reorderSequences (mainConstruct, appendedConstruct, restOfBody) {
    if (mainConstruct.length === 0) {
        if (!restOfBody) {
            return appendedConstruct;
        } else {
            return ['Sequence', appendedConstruct, restOfBody];
        }
    }
    // if the body of the loop has no sequence then we just create one
    if (mainConstruct[0] !== 'Sequence') {
        if (!restOfBody) {
            return ['Sequence', mainConstruct, appendedConstruct];
        } else {
            return ['Sequence', mainConstruct, ['Sequence', appendedConstruct, restOfBody]];
        }
    }
    return  ['Sequence', mainConstruct[1], reorderSequences(mainConstruct[2], appendedConstruct, restOfBody)];
}

function evaluateBody(body, variableStore, functionStore) {
    if (body.length === 0) {
        return []; // to signify nothing to evaluate
    }

    switch(body[0]) {
        case 'Sequence':
            let evaluatedStatement = [];
            if (body[1][0] === 'Let') {
                evaluatedStatement = evaluateBody(body[1], variableStore, functionStore);
             } else {
                evaluatedStatement = evaluateStatement(body[1], variableStore, functionStore);
             } 

            if(evaluatedStatement[0] === 'Error' || fullyEvaluated(evaluatedStatement)) {
                return evaluatedStatement;
            } else {
                if (evaluatedStatement[0] === 'Break') {
                    return [];
                }
            }

            // check if it has a body to evaluate after first statement
            if (body.length > 1) {
                // only evaluate body if we went through a loop, totally unrolled and aren't in the middle of an unrolling
                let evaluatedBody = []; 
                if (body[1][0] === 'Let') {
                    if (totallyUnrolled || maxLoopUnrolling !== 10) {
                        evaluatedBody = evaluateBody(body[2], variableStore, functionStore);
                    } else {
                        evaluatedBody = body[2];
                    }
                } else {
                    // do not evaluate body if the statement is an unevaluated if/switch
                    if (evaluatedStatement[0] !== 'If' && evaluatedStatement[0] !== 'Switch') {
                        evaluatedBody = evaluateBody(body[2], variableStore, functionStore);
                    } else {
                        evaluatedBody = body[2];
                    }
                }
                // otherwise just assign it to its old position and reorder sequence sequence formations
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
        case 'New': 
            return evaluateVariableDeclaration(body, variableStore, functionStore);
        case 'Let':
            return evaluateVariableDeclaration(body, variableStore, functionStore);
        case 'Loop':
            // evaluate condition and check if it it's a constant
            const evaluatedCondition = evaluateExpression(body[1], variableStore, functionStore);
            if (maxLoopUnrolling > 0 && evaluatedCondition[0] === 'Const') {
                const reorderedBody = reorderSequences(body[2][1], body[2][2], body);
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
            return evaluateStatement(body, variableStore, functionStore);
    }
}

function updateArray(array, index, indicesArray, value) {
    if (!array && index !== indicesArray.length) {
        throw new Error('Cannot access index ' + indicesArray[index][1] + ' of array');
    }
    if (index === indicesArray.length) {
        // if we replace a value in the array, return it, otherwise return the array index
        if (!value) {
            return array;
        } else {
            return value;
        }
    }
    // access field 1 to get the constant value and the actual array
    // fill in empty places
    if (indicesArray[index][1] > array[1].length) {
        for(let j = array[1].length; j < indicesArray[index][1]; j = j + 1) {
            array[1][j] = ['Const', undefined];
        }
    }
    // if we replace a value in the array, then update the index, otheriwse return it
    if (!value) {
        return updateArray(array[1][indicesArray[index][1]], index + 1, indicesArray);   
    } else {
        array[1][indicesArray[index][1]] = updateArray(array[1][indicesArray[index][1]], index + 1, indicesArray, value);
        return array;
    }
}

function evaluateStatement (statement, variableStore, functionStore) {
    switch(statement[0]) {
        case 'Assign': 
            // the left hand side of an assignment can only be an identifier
            if (statement[1][0] === 'Identifier') {
                const evaluatedIdentifier = evaluateIdentifier(statement[1]);
                const evaluatedExpression = evaluateExpression(statement[2], variableStore, functionStore);
                if (variableStore[evaluatedIdentifier[1]]) {
                    variableStore[evaluatedIdentifier[1]] = evaluatedExpression;
                } else {
                    if (globalVariableStore[evaluatedIdentifier[1]]) {
                        globalVariableStore[evaluatedIdentifier[1]] = evaluatedExpression;
                    } else {
                        console.log('add variable ' + evaluatedIdentifier[1]);
                        // show that the variable is still being used
                        usedVariables[evaluatedIdentifier[1]] = true;
                    }
                }
                return []; // signify we don't need to return anything because we've already evaluated
            } else { 
                if (statement[1][0] === 'Index') {
                    const evaluatedIdentifier = evaluateIdentifier(statement[1][1], variableStore, functionStore);
                    let evaluatedIndicesArray = [];
                    let hasNonConstant = false;
                    for(let i = 0; i < statement[1][2].length; i = i + 1) {
                        evaluatedIndicesArray[i] = evaluateExpression(statement[1][2][i], variableStore, functionStore);
                        if (evaluatedIndicesArray[i][0] !== 'Const') {
                            hasNonConstant = true;
                        }
                    }
                    if (!hasNonConstant) {
                        const evaluatedValue = evaluateExpression(statement[2], variableStore, functionStore);
                        if (variableStore[evaluatedIdentifier[1]]) {
                            updateArray(variableStore[evaluatedIdentifier[1]], 0, evaluatedIndicesArray, evaluatedValue);
                        } else {
                            if (globalVariableStore[evaluatedIdentifier[1]]) {
                                updateArray(globalVariableStore[evaluatedIdentifier[1]], 0, evaluatedIndicesArray, evaluatedValue);
                            } else {
                                console.log('add variable ' + evaluatedIdentifier[1]);
                                // show that the array is still being used
                                usedVariables[evaluatedIdentifier[1]] = true;
                            }
                        }
                        return []; // signify we don't need to return anything because we've already evaluated
                    } else {
                        console.log('add variable ' + evaluatedIdentifier[1]);
                        // show that the array is still being used
                        usedVariables[evaluatedIdentifier[1]] = true;
                        return ['Assign', ['Index', evaluatedIdentifier, evaluatedExpressionArray], evaluateExpression(statement[2], variableStore, functionStore)];
                    }
                } else {
                    throw new Error('Can only assign to a variable or the index of an array');
                }
            }
        case 'Print':
            // do not actually print, just evaluate whatever needs printing
            return ["Print", evaluateExpression(statement[1], variableStore, functionStore)];
        case 'Error':
            // do not actually throw error, just evaluate whatever needs printing
            return ["Error", evaluateExpression(statement[1], variableStore, functionStore)];
        case 'If':
            const evaluatedIfExpression = evaluateExpression(statement[1], variableStore, functionStore);
            if (evaluatedIfExpression[0] === 'Const') {
                if (evaluatedIfExpression[1]) {
                    return evaluateBody(statement[2], variableStore, functionStore);
                } else {
                    return evaluateBody(statement[3], variableStore, functionStore);
                }
            } else {
                return ["If", evaluatedIfExpression, statement[2], statement[3]];
            }
        case 'Switch':
            const evaluatedExpression = evaluateExpression(statement[1], variableStore, functionStore);
            // if we know the value we can continue
            if (evaluatedExpression[0] === 'Const') {
                let evaluatedConstant = [];
                let cases = [];
                let j = 0;
                // iterate though the cases
                for (let i = 0; i < statement[2].length; i = i + 1) {
                    // once we have not evaluated some cases, the rest can't be either
                    if (statement[2][i][0] === 'Case' && j === 0) {
                        evaluatedConstant = evaluateExpression(statement[2][i][1], variableStore, functionStore);
                        // if we can check, continue
                        if (evaluatedConstant[0] === 'Const') {
                            // if the values match just return the body of this case
                            // otherwise we do nothing
                            if (evaluatedConstant[1] === evaluatedExpression[1]) {
                                const evaluatedBody = evaluateBody(statement[2][i][2], variableStore, functionStore);
                                // check if we returned or there was a break and return the result
                                if (evaluatedBody.length !== 0 || evaluatedBody[0] === 'Break') {
                                    return [];
                                }
                                // otherwise, do not do anything
                            }
                        } else {
                            // otherwise return case
                            cases[j] = ['Case', evaluatedConstant, statement[2][i][2]];
                            j = j + 1;
                        } 
                    } else {
                        // we have either reached the default or there are cases that haven't been evaluated
                        // check if other cases need to be run
                        if (j !== 0) {
                            // if so, do not evaluate and just add it to the cases
                            cases[j] = statement[2][i][1];
                            j = j + 1;
                        } else {
                            // otherwise just evaluate and return here
                            return evaluateBody(statement[2][i][1], variableStore, functionStore);
                        }
                    }
                }
                // now return when cases were not evaluated
                return ['Switch', evaluatedExpression, cases];
            } else {
                // otherwise just return it as it is
                return ['Switch', evaluatedExpression, statement[2]];
            }
        case 'Return':
            // check if can put a return in front of it or not
            const evaluatedReturnExpression = evaluateExpression(statement[1], variableStore, functionStore);
            if (fullyEvaluated(['Return', evaluatedReturnExpression])) {
                return ['Return', evaluatedReturnExpression];
            } else {
                return evaluatedReturnExpression;
            }
        case 'Break':
            return ['Break'];
        default:
            evaluateExpression(statement, variableStore, functionStore);
            return [];
    }
}

function evaluateExpression (expression, variableStore, functionStore) {
    switch(expression[0]) {
        case 'Application':
            const evaluatedApplication = evaluateApplication(expression, variableStore, functionStore);
            if (evaluatedApplication.length !== 0 && evaluatedApplication[0] === 'Return') {
                return evaluatedApplication[1];
            } else {
                return evaluatedApplication;
            }
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
            }
            if (!hasNonConstants) {
                return ['Array', array];
            } else {
                return array;
            }
        case 'Length':
            const evaluatedLengthExpression = evaluateExpression(expression[1], variableStore);
            if (fullyEvaluated(['Return', evaluatedLengthExpression])) {
                return ['Const', evaluatedLengthExpression[1].length];
            } else {
                return ['Length', evaluatedLengthExpression];
            }
        case 'Keys':
            const evaluatedKeysExpression = evaluateDereference(expression[1], variableStore);
            if (fullyEvaluated(['Return', evaluatedKeysExpression])) {
                return ['Array', Object.keys(evaluatedKeysExpression[1])];
            } else {
                return ['Keys', evaluatedKeysExpression];
            }
        default:
            throw new Error('Cannot perform partial evaluation on expression ' + expression[0]);
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
        let evaluatedIndicesArray = [];
        let hasNonConstant = false;
        for(let i = 0; i < dereference[1][2].length; i = i + 1) {
            evaluatedIndicesArray[i] = evaluateExpression(dereference[1][2][i], variableStore, functionStore);
            if (evaluatedIndicesArray[i][0] !== 'Const') {
                hasNonConstant = true;
            }
        }
        if (!hasNonConstant) {
            return updateArray(variableStore[evaluatedIdentifier[1]] || globalVariableStore[evaluatedIdentifier[1]], 0, evaluatedIndicesArray);
        } else {
            return ['Deref', ['Index', dereference[1][1], evaluatedIndicesArray]];
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
            (operator[0] === 'And' && result1[0] === 'Const' && result1[1])) {
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