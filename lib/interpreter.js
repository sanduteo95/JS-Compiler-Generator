
let stackAddress = 1;
let heapAddress = -1;
let stack = [];
let heap = [];
let printAddress = 0;
let throwAddress = 1;

let globalVariablesStore = [];

function interpret (program, functionApplication) {
    const address = interpretProgram(program, functionApplication);
    // if the address points somewhere on the stack
    // print out the value from the stack
    if (address !== -1) {
        return stack[address];
    }
}

function interpretProgram (program, functionApplication) {
    let address = -1;

    // check first if there are any global variables
    if (program[0] === 'New') {
        // interpret the expression that signifies the value of the new variable
        address = interpretExpression(program[2], globalVariablesStore, []);
        // point new variable to address
        globalVariablesStore[program[1]] = address;
        // evaluate the rest of the body with the new variable
        let newAddress = interpretProgram(program[3], functionApplication);
        // if the address has changed then change the value in the stack at the current address
        if (address !== newAddress) {
            stack[address] = stack[newAddress];
        }
        // clean up stack after current position
        stackAddress = address;
    } else {
        // interpret each function at a time
        address = interpretFunctions(program, 0, functionApplication, []);
    }
    return address;
}

function interpretFunctions (functionArray, index, functionApplication, functionStore) {
    // if there's nothing left in the program, we interpret the function application given as an argument at the beginning
    if (index === functionArray.length) {
        return interpretApplication(functionApplication, [], functionStore);
    }

    const functionDefinition = functionArray[index];
    if (functionDefinition[0] === 'Function') {
        // increment the stack and heap address for the function definition
        stackAddress = stackAddress + 1;
        heapAddress = heapAddress + 1;
        // the variable store holds the name of the function, with the address in the stack
        functionStore[functionDefinition[1]] = stackAddress;
        // the stack contains the address in the heap
        stack[stackAddress] = heapAddress;
        // the heap contains the entire function definition, to be interpreted when function is called
        heap[heapAddress] = functionDefinition;
        return interpretFunctions(functionArray, index + 1, functionApplication, functionStore);
    } else {
        throw new Error('Failed to interpret program for ' + functionDefinition[0]);
    }
}

function interpretApplication (application, variableStore, functionStore) {    
    // get the function definition from the heap (the function name is inside an Identifier)
    const functionDefinition = heap[stack[functionStore[application[1][1]]]];
    // check if function has been defined before 
    if (!functionDefinition) {
        throw new Error('Function ' + application[1][1] + ' is not defined at this point in the program execution.')
    }

    // check if the function has been called with enough parameters
    if (application[2].length < functionDefinition[2].length) {
        throw new Error('Function ' + application[1] + ' has been called with too little.');
    }
    
    // create a new variable store for variables that only the new function will know
    const newVariableStore = globalVariablesStore;
    for(let i = 0; i < application[2].length; i = i + 1) {
        // interpret each parameter
        const address = interpretExpression(application[2][i], variableStore, functionStore);
        // store the parameter on the stack at a new address
        stackAddress = stackAddress + 1;
        stack[stackAddress] = stack[address];
        // make the "new" variable point at address on the stack
        newVariableStore[functionDefinition[2][i]] = stackAddress;
    }

    let newFunctionStore = [];
    const functionNames = Object.keys(functionStore);
    for(let i = 0; i < functionNames.length; i = i + 1) {
        const name = functionNames[i];
        // filter out functions that are defined after the function we're calling
        // and function whose names are in the new variable store too
        if (functionStore[name] <= functionStore[application[1][1]] && !newVariableStore[name]) {
            newFunctionStore[name] = functionStore[name];
        }
    }

    return interpretBody(functionDefinition[3], newVariableStore, newFunctionStore);
}

function interpretBody (body, variableStore, functionStore) {
    let address = -1;

    // the body can be empty so we return -1
    if (body.length === 0) {
        return address;
    }

    switch(body[0]) {
        case 'Sequence':
            // interpret the first (compulsory) statement
            address = interpretStatement(body[1], variableStore, functionStore);
            // make sure to check if the statement was a return, print statement or throw statement
            if (address === printAddress) {
                console.log(stack[address]);
            } else {
                if (address === throwAddress) {
                    throw new Error(stack[address]);
                } else {
                    if (address !== -1) {
                        return address;
                    }
                }
            }

            // check if it has a body to interpret after first statement
            if (body.length > 1) {
                address = interpretBody(body[2], variableStore, functionStore);
            }

            break;
        case 'New':
            // interpret the expression that signifies the value of the new variable
            address = interpretExpression(body[2], variableStore, functionStore);
            // point new variable to address
            variableStore[body[1]] = address;
            // evaluate the rest of the body with the new variable
            let newAddress = interpretBody(body[3], variableStore, functionStore);
            // if the address has changed then change the value in the stack at the current address
            if (address !== newAddress) {
                stack[address] = stack[newAddress];
            }
            // clean up stack after current position
            stackAddress = address;
            break;
        default:
            address = interpretExpression(body, variableStore, functionStore);
    }
    return address;
}

function interpretStatement (statement, variableStore, functionStore) {
    let address = -1;
    switch(statement[0]) {
        case 'Assign':
            let newAddress;
            // the left-hand side of an assignment can only be an identifier or index of an array
            // evaluate the expression on the right-hand side
            if (statement[1][0] === 'Identifier') {
                newAddress = interpretIdentifier(statement[1], variableStore);
                // change the value in the stack at the current address to the vlaue from the new address
                stack[newAddress] = stack[interpretExpression(statement[2], variableStore, functionStore)];
            } else {
                if (statement[1][0] === 'Index') {
                    newAddress = interpretIdentifier(statement[1][1], variableStore);
                    const indexAddress = interpretExpression(statement[1][2], variableStore, functionStore);
                    stack[newAddress][stack[indexAddress]] = stack[interpretExpression(statement[2], variableStore, functionStore)];
                } else {
                    throw new Error('Can only assign to a variable or the index of an array');
                }
            }
            break;
        case 'Application':
            interpretApplication(statement, variableStore, functionStore);
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
        default:
            throw new Error('Failed to interpret the statement for ' + statement[0]);
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
            let array = [];
            for(let i = 0;i < expression[1].length; i = i + 1) {
                array[i] = stack[interpretExpression(expression[1][i], variableStore, functionStore)];
            }
            stackAddress = stackAddress + 1;
            stack[stackAddress] = array;
            return stackAddress;
        case 'Length':
            const address1 = interpretIdentifier(expression[1], variableStore);
            stackAddress = stackAddress + 1;
            stack[stackAddress] = stack[address1].length;
            return stackAddress;
        case 'Keys':
            const address2 = interpretIdentifier(expression[1], variableStore);
            stackAddress = stackAddress + 1;
            stack[stackAddress] = Object.keys(stack[address2]);
            return stackAddress;
        default:
            throw new Error('Failed to interpret expression for ' + expression[0]);
    }
}

function interpretIdentifier (identifier, variableStore) {
    // just get the address on the stack pointed at by the identifier
    const address = variableStore[identifier[1]];
    if (!address) {
        throw new Error('Variable ' + identifier[1] + ' has not been defined');
    }
    return address;
}

function interpretDereference (dereference, variableStore, functionStore) {
    let address = -1;
    // get address of the identifier/index on th stack
    if (dereference[1][0] === 'Index') {
        address = interpretIdentifier(dereference[1][1], variableStore);
        const indexAddress = interpretExpression(dereference[1][2], variableStore, functionStore);
        // increase the stack address and store the value of the identifier there
        stackAddress = stackAddress + 1;
        stack[stackAddress] = stack[address][stack[indexAddress]];
    } else {
        address = interpretIdentifier(dereference[1], variableStore);
        // increase the stack address and store the value of the identifier there
        stackAddress = stackAddress + 1;
        stack[stackAddress] = stack[address];
    }
    return stackAddress;
}

function interpretConstant (constant) {
    // just increment the address on the stack and assign it the constant value
    stackAddress = stackAddress + 1;
    stack[stackAddress] = constant[1];
    return stackAddress;
}

function interpretOperator (operator, variableStore, functionStore) {
    let address1 = -1;
    let address2 = -1;
    address1 = interpretExpression(operator[1], variableStore, functionStore);
    if (operator[0] !== 'Negate' && operator[0] !== 'Negative') {
        // don't interpret stuff if not needed to
        if ((operator[0] === 'Or' && stack[address1]) || 
            (operator[0] === 'And' && !stack[address1])) {
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
            throw new Error('Failed to interpret operator for ' + operator[0])
    }
    return address1;
}

module.exports = {
    interpret: interpret
}