let emptyAddress = 0;
let printAddress = 1;
let throwAddress = 2;
let stackAddress = throwAddress;
let stack = [];
let globalVariablesStore = [];
let isBreak = false;

function interpret (program, functionApplication) {
    let result = undefined;
    const address = interpretProgram(program, functionApplication);
    // if the address points somewhere on the stack then store it
    if (address !== emptyAddress) {
        result = stack[address];
    }
    // reset the stack and global variables
    stackAddress = 0;
    stack = [];
    globalVariablesStore = [];
    
    return result;
}

function interpretProgram (program, functionApplication) {
    if (program[0] === 'Export' && program[1].length !== 0) {
        // first check if function application is for an exported
        for (let i = 0; i < program[1].length; i = i + 1) {
            if (program[1][i] === functionApplication[1][1]) {
                return interpretContent(program[2], functionApplication);
            }
        }                
        throw new Error('Function ' + functionApplication[1][1] + ' was not exported by module');
    } else {
        // throw error because the function should be exported in order to be called
        throw new Error('No functions were exported by this module.');
    }
}

function interpretVariableDeclaration (variableDeclaration, variableStore, functionStore, functionApplication) {
    // interpret the expression that signifies the value of the new variable
    const address = interpretExpression(variableDeclaration[2], variableStore, functionStore);
    // point new variable to address
    variableStore[variableDeclaration[1]] = address;
    // evaluate the rest of the body with the new variable
    if (!functionApplication) {
        // if we are not passed a function application then we are evaluating a local variable
        return interpretBody(variableDeclaration[3], variableStore, functionStore);
    } else {
        // if we are passed a function application then we are evaluating a global variable
        return interpretContent(variableDeclaration[3], functionApplication);
    }
}

function interpretContent (content, functionApplication) {
    // check first if there are any global variables
    if (content[0] === 'New') {
        return interpretVariableDeclaration(content, globalVariablesStore, [], functionApplication);
    } else {
        // interpret each function at a time
        return interpretFunctions(content, 0, functionApplication, []);
    }
}

function interpretFunctions (functionArray, index, functionApplication, functionStore) {
    // if there's nothing left in the program, we interpret the function application given as an argument at the beginning
    if (index === functionArray.length) {
        return interpretApplication(functionApplication, [], functionStore);
    }

    const functionDefinition = functionArray[index];
    if (functionDefinition[0] === 'Function') {
        // increment the stack address for the function definition
        stackAddress = stackAddress + 1;
        // the variable store holds the name of the function, with the address in the stack
        functionStore[functionDefinition[1]] = stackAddress;
        // the stack contains the entire function definition
        stack[stackAddress] = functionDefinition;
        return interpretFunctions(functionArray, index + 1, functionApplication, functionStore);
    } else {
        throw new Error('Failed to interpret expected function. Received a ' + functionDefinition[0]);
    }
}

function interpretApplication (application, variableStore, functionStore) {  
    // get the function definition from the stack
    const functionDefinition = stack[functionStore[application[1][1]]];

    // check if function has been defined before 
    if (!functionDefinition) {
        throw new Error('Function ' + application[1][1] + ' is not defined at this point in the program execution.');
    }

    // check if the function has been called with enough parameters
    if (application[2].length < functionDefinition[2].length) {
        throw new Error('Function ' + application[1] + ' has been called with too little.');
    }

    // stack address before creating space for new function call
    const savedStackAddress = stackAddress;

    // create a new variable store for variables that only the new function will know
    const newVariableStore = [];
    for(let i = 0; i < application[2].length; i = i + 1) {
        // interpret each parameter
        const address = interpretExpression(application[2][i], variableStore, functionStore);
        // store the parameter on the stack at a new address
        stackAddress = stackAddress + 1;
        stack[stackAddress] = stack[address];
        // make the new variable point at address on the stack
        newVariableStore[functionDefinition[2][i]] = stackAddress;
    }

    let newFunctionStore = [];
    const functionNames = Object.keys(functionStore);
    for(let i = 0; i < functionNames.length; i = i + 1) {
        const name = functionNames[i];
        // filter out functions whose names are in the new variable store too
        if (!newVariableStore[name]) {
            newFunctionStore[name] = functionStore[name];
        }
    }

    const address = interpretBody(functionDefinition[3], newVariableStore, newFunctionStore);
    // wipe out stack and create new slot for the return value of the function
    stackAddress = savedStackAddress;
    stackAddress = stackAddress + 1;
    stack[stackAddress] = stack[address];
    return stackAddress;
}

function reorderSequences (mainConstruct, appendedConstruct, restOfBody) {
    // sometimes loops can mangle the body 
    // we need to reorder the sequences so they're in the expected format
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

function interpretBody (body, variableStore, functionStore) {
    // the body can be empty so we return -1
    if (body.length === 0) {
        return emptyAddress;
    }

    switch(body[0]) {
        case 'Sequence':
            let stmtAddress = emptyAddress;
            if (body[1][0] === 'Let') {
                stmtAddress = interpretBody(body[1], variableStore, functionStore);
            } else {
                stmtAddress = interpretStatement(body[1], variableStore, functionStore);
            }
            // make sure to check if the statement was a return, print statement or throw statement
            if (stmtAddress === printAddress) {
                console.log(stack[stmtAddress]);
            } else {
                if (stmtAddress === throwAddress) {
                    throw new Error(stack[stmtAddress]);
                } else {
                    // if statement returned or break was true then stop
                    if (stmtAddress !== emptyAddress || isBreak) {
                        isBreak = false;
                        return stmtAddress;
                    }
                }
            }

            // check if it has a body to interpret after first statement
            if (body.length > 1) {
                return interpretBody(body[2], variableStore, functionStore);
            }
        case 'New': 
            return interpretVariableDeclaration(body, variableStore, functionStore);
        case 'Let':
            return interpretVariableDeclaration(body, variableStore, functionStore);
        case 'Loop':
            // check the condition
            const conditionAddress = interpretExpression(body[1], variableStore, functionStore);
            if (stack[conditionAddress]) {
                const reorderedBody = reorderSequences(body[2][1], body[2][2], body);
                // interpret the body, and return it after interpretting the statement that tells the loop how to change
                return interpretBody(reorderedBody, variableStore, functionStore);
            } else {
                return emptyAddress;
            }
        default:
            return interpretStatement(body, variableStore, functionStore);
    }
}

function updateArray(array, index, indicesArray, address) {
    if (!array && index !== indicesArray.length) {
        throw new Error('Cannot access index ' + indicesArray[index][1] + ' of array');
    }
    if (index === indicesArray.length) {
        // if we replace an address in the array, return it, otherwise return the array index
        if (!address) {
            return array;
        } else {
            return stack[address];
        }
    }
    // fill in empty places
    if (stack[indicesArray[index] ]> array.length) {
        for(let j = array.length; j < stack[indicesArray[index]]; j = j + 1) {
            array[j] = undefined;
        }
    }
    // if we replace a address in the array, then update the index, otherwise return it
    if (!address) {
        return updateArray(array[stack[indicesArray[index]]], index + 1, indicesArray);   
    } else {
        array[stack[indicesArray[index]]] = updateArray(array[stack[indicesArray[index]]], index + 1, indicesArray, address);
        return array;
    }
}

function interpretStatement (statement, variableStore, functionStore) {
    let address = emptyAddress;
    switch(statement[0]) {
        case 'Assign':
            // the left-hand side of an assignment can only be an identifier or index of an array
            // evaluate the expression on the right-hand side
            if (statement[1][0] === 'Identifier') {
                const idAddress = interpretIdentifier(statement[1], variableStore);
                const newAddress = interpretExpression(statement[2], variableStore, functionStore);
                // change the value in the stack at the current address to the vlaue from the new address
                stack[idAddress] = stack[newAddress];
            } else {
                if (statement[1][0] === 'Index') {
                    const arrAddress = interpretIdentifier(statement[1][1], variableStore);
                    let indexAddressArray = [];
                    for(let i = 0; i < statement[1][2].length; i = i + 1) {
                        indexAddressArray[i] = interpretExpression(statement[1][2][i], variableStore, functionStore);
                    }
                    const valueAddress = interpretExpression(statement[2], variableStore, functionStore);
                    updateArray(stack[arrAddress], 0, indexAddressArray, valueAddress);
                } else {
                    throw new Error('Can only assign to a variable or the index of an array');
                }
            }
            break;
        case 'Print':
            // do not print yet, just store the value at an address and return the print address
            address = interpretExpression(statement[1], variableStore, functionStore);
            stack[printAddress] = stack[address];
            address = printAddress;
            break;
        case 'Error':
            // do not print yet, just store the value at an address and return the throw address
            address = interpretExpression(statement[1], variableStore, functionStore);
            stack[throwAddress] = stack[address];
            address = throwAddress;
            break;
        case 'If': 
            // It's a special type of statement that contains body and doesn't need semi collons
            const address1 = interpretExpression(statement[1], variableStore, functionStore);
            if (stack[address1]) {
                address = interpretBody(statement[2], variableStore, functionStore);
            } else {
                address = interpretBody(statement[3], variableStore, functionStore);
            }
            break;
        case 'Switch':
            const expressionAddress = interpretExpression(statement[1], variableStore, functionStore);
            let constantAddress = emptyAddress;
            // iterate though the cases
            for (let i = 0; i < statement[2].length; i = i + 1) {
                if (statement[2][i][0] === 'Case') {
                    constantAddress = interpretExpression(statement[2][i][1], variableStore, functionStore);
                    if (stack[expressionAddress] === stack[constantAddress]) {
                        // if we found a match, interpret the body
                        const bodyAddress = interpretBody(statement[2][i][2], variableStore, functionStore);
                        // check if we returned or there was a break
                        if (bodyAddress !== emptyAddress || isBreak) {
                            isBreak = false;
                            return bodyAddress;
                        }
                    }
                } else {
                    // we have reached the default
                    return interpretBody(statement[2][i][1], variableStore, functionStore);
                }
            }
        case 'Return':
            return interpretExpression(statement[1], variableStore, functionStore);
        case 'Break':
            // set break to true
            isBreak = true;
            return emptyAddress;
        default:
            interpretExpression(statement, variableStore, functionStore);
            return emptyAddress;
    }
    return address;
}

function interpretExpression (expression, variableStore, functionStore) {
    // an expression can only be a function application, variable dereference, operator or constant
    switch(expression[0]) {
        case 'Application':
            return interpretApplication(expression, variableStore, functionStore);
        case 'Deref':
            return interpretDereference(expression, variableStore, functionStore);
        case 'Operator':
            return interpretOperator(expression[1], variableStore, functionStore);
        case 'Const':
            return interpretConstant(expression);   
        case 'Array':
            return interpretArrayExpression(expression, variableStore, functionStore);
        case 'Length':
            return interpretArrayExpression(expression, variableStore, functionStore);
        case 'Keys':
            return interpretArrayExpression(expression, variableStore, functionStore);
        default:
            throw new Error('Failed to interpret expression for ' + expression[0]);
    }
}

function interpretArrayExpression (arrayExpression, variableStore, functionStore) {
    let result = undefined;
    if (arrayExpression[0] === 'Array') {
        const savedStackAddress = stackAddress;
        result = [];
        for(let i = 0;i < arrayExpression[1].length; i = i + 1) {
            result[i] = stack[interpretExpression(arrayExpression[1][i], variableStore, functionStore)];
        }
        stackAddress = savedStackAddress;
    } else {
        const idAddress = interpretDereference(arrayExpression[1], variableStore);
        if (arrayExpression[0] === 'Length') {
            result = stack[idAddress].length;
        } else {
            if (arrayExpression[0] === 'Keys') {
                result = Object.keys(stack[idAddress]);
            } else {
                throw new Error('Failed to interpret the array epxression for ' + arrayExpression[0]);
            }
        }
    }
    stackAddress = stackAddress + 1;
    stack[stackAddress] = result;
    return stackAddress;
}

function interpretIdentifier (identifier, variableStore) {
    // just get the address on the stack pointed at by the identifier
    const address = variableStore[identifier[1]] || globalVariablesStore[identifier[1]];
    if (!address) {
        throw new Error('Variable ' + identifier[1] + ' has not been defined');
    }
    return address;
}

function interpretDereference (dereference, variableStore, functionStore) {
    let idAddress = emptyAddress;
    let result = undefined;
    // get address of the identifier/index on th stack
    if (dereference[1][0] === 'Index') {
        idAddress = interpretIdentifier(dereference[1][1], variableStore);
        let indexAddressArray = [];
        for(let i = 0; i < dereference[1][2].length; i = i + 1) {
            indexAddressArray[i] = interpretExpression(dereference[1][2][i], variableStore, functionStore);
        }
        result = updateArray(stack[idAddress], 0, indexAddressArray);
    } else {
        idAddress = interpretIdentifier(dereference[1], variableStore);
        result = stack[idAddress];
    }
    // increase the stack address and store the value of the identifier there
    stackAddress = stackAddress + 1;
    stack[stackAddress] = result;
    return stackAddress;
}

function interpretConstant (constant) {
    // just increment the address on the stack and assign it the constant value
    stackAddress = stackAddress + 1;
    stack[stackAddress] = constant[1];
    return stackAddress;
}

function interpretOperator (operator, variableStore, functionStore) {
    let address1 = emptyAddress;
    let address2 = emptyAddress;
    address1 = interpretExpression(operator[1], variableStore, functionStore);
    if (operator[0] !== 'Negate' && operator[0] !== 'Negative') {
        // don't interpret stuff if not needed to
        if ((operator[0] === 'Or' && stack[address1]) || 
            (operator[0] === 'And' && !stack[address1])) {
            // clean up stack
            stackAddress = address1;
            return address1;
        }
        address2 = interpretExpression(operator[2], variableStore, functionStore);
    }
    
    switch(operator[0]) {
        case 'Plus':   
            stack[address1] = stack[address1] + stack[address2];
            break;
        case 'Minus':
            stack[address1] = stack[address1] - stack[address2];
            break;
        case 'Times':
            stack[address1] = stack[address1] * stack[address2];
            break;
        case 'Divide':
            stack[address1] = stack[address1] / stack[address2];
            break;
        case 'Modulus':
            stack[address1] = stack[address1] % stack[address2];
            break;
        case 'Eq':
            stack[address1] = stack[address1] == stack[address2];
            break;
        case 'StrictEq':
            stack[address1] = stack[address1] === stack[address2];
            break;
        case 'Noteq':
            stack[address1] = stack[address1] != stack[address2];
            break;
        case 'StrictNoteq':
            stack[address1] = stack[address1] !== stack[address2];
            break;
        case 'Leq':
            stack[address1] = stack[address1] <= stack[address2];
            break;
        case 'Less':
            stack[address1] = stack[address1] < stack[address2];
            break;
        case 'Geq':
            stack[address1] = stack[address1] >= stack[address2];
            break;
        case 'Greater':
            stack[address1] = stack[address1] > stack[address2];
            break;
        case 'And':
            stack[address1] = stack[address1] && stack[address2];
            break;
        case 'Or':
            stack[address1] = stack[address1] || stack[address2];
            break;
        case 'Negate':
            stack[address1] = !stack[address1];
            break;
        case 'Negative':
            stack[address1] = - stack[address1];
            break;
        default:
            throw new Error('Failed to interpret operator for ' + operator[0]);
    }
    // clean up stack
    stackAddress = address1;
    return address1;
}

module.exports = {
    interpret: interpret
}