// f(): undefined
const simpleFunctionNothing = {
    program: `function f () {
    }`,
    functionApplication: `f()`,
    expected: undefined
}
    
// g(): undefined
const nestedFunctionCallNothing = {
    program: `function f () {
    }
    
    function g () {
        f();
    }`,
    functionApplication: `g()`,
    expected: undefined
}
    
// f(): undefined
const simpleFunctionCallNoReturn = {
    program: `function f () {  
        var x = 2; 
        var y = x;
        x = x + 1;
    }`,
    functionApplication: `f()`,
    expected: undefined
}
    
// f(): 5
const simpleFunctionCallWithReturn = {
    program: `function f () {  
        var x = 2; 
        var y = x;
        x = x + 1;
        return x + y;
    }`,
    functionApplication: `f()`,
    expected: 5
}

// f(5): 10
const functionCallWithOneParameter = {
    program: `function f (z) {  
        var x = 2; 
        var y = x;
        x = x + 1;
        return x + y + z;
    }`,
    functionApplication: `f(5)`,
    expected: 10
}
    
// isSquareRootOf(2, 3): false
const functionCallsWithMultipleParameters = {
    program: `function isSquareRootOf(x, n) {
        return x * x == n;
    }`,
    // functionApplication: `isSquareRootOf(2)`,
    functionApplication: `isSquareRootOf(2, 3)`,
    expected: false
}
    
// isSquareRootOf(2, 4): true
const nestedFunctionCallsWithMultipleParameters = {
    program: `function square (x) {  
        return x * x;
    }

    function isSquareRootOf(x, n) {
        return square(x) == n;
    }`,
    functionApplication: `isSquareRootOf(2, 4)`,
    expected: true
}
    
// g(): error (g called function that was defined after it)
const badOrderFunctions = {
    program: `function g() {
        return f(1);
    }
    function f(x) {
        return x;
    }`,
    functionApplication: `g()`,
    expected: 'error' 
}
    
// g(5): error (f is both function and variable)
const varaibleAndFunctionNameError = {
    program: `function f() {
        return 1;
    }
    
    function g(f) {
        return f(f);
    }`,
    functionApplication: `g(5)`,
    expected: 'error'
}  

// call(5, 6, 7): -155
const complexFunction = {
    program: `function j (a, b, c) {  
        return a + b + c;
    }

    function g (a, b, c) {
        return a * b * c;
    }

    function h (a, b, c, d, e, f) {
        return j(a, b, c) - g(d, e, f);
    }

    function call(a, b, c) {
        var x = 1;
        x = x + 1;
        var y = 2;
        y = y * 3;
        var z = y - x;
        return h(a, x, b, y, c, z);
    }`,
    functionApplication: `call(5, 6, 7)`,
    expected: -155
}

// h(5, 2, 6, 6, 7, 4) - b, c are wrong
// j(5, 2, 6) = 13 
// g(6, 7, 4) = 168

// f(): -1
const negativeNumber = {
    program: `function f() {
        return -1;
    }`,
    functionApplication: `f()`,
    expected: -1
}
    
// f(): hey there
const stringVariable = {
    program: `function f(s) {
        return 'hey ' + s;
    }`,
    functionApplication: `f('there')`,
    expected: 'hey there'
}
    
// f(): just prints out the text
const consoleLogging = {
    program: `function f() {
        console.log('printing stuff only');
        return 1;
    }`,
    functionApplication: `f(0)`,
    expected: 1
}
    
// f(): just prints 0 and works
const comments = {
    program: `function f() {
        /* multiple 
        line 
        comment */
        // single line comment
        return 0;
    }`,
    functionApplication: `f()`,
    expected: 0
}
    
// f(): throws error Some error
const errorThrowing = {
    program: `function f() {
        throw new Error('error');
        return 1;
    }`,
    functionApplication: `f()`,
    expected: 'error'
}

// f(1): prints out 1..10
const recursion = {
    program: `function f(x) {
        console.log(x);
        return x == 10 || f(x+1);
    }`,
    functionApplication: `f(1)`,
    expected: true
}

// f(): 1
const earlyReturn = {
    program: `function f() {
        var x=1;
        return x;
        x=x+1;
        return x;
    }`,
    functionApplication: `f()`,
    expected: 1
}

// f(0, 2): 2
const ifStatement = {
    program: `function f (x, y) {  
        if (x !== 0) {
            return x;
        } else {
            if (y !== 0) {
                return y;
            }
        }
        return 0;
    }`,
    functionApplication: `f(0, 2)`,
    expected: 2
}

const arrayFunctions = {
    program: `function f(a) {
        var x = [a, a, a, 4]; 
        return x.length + x[3];
    }`,
    functionApplication: `f(1)`,
    expected: 8
}

const objectKeys = {
    program: `function f() {
        var x = []; 
        x['hey'] = 'test';
        x['there'] = 'text';
        return Object.keys(x);
    }`,
    functionApplication: `f()`,
    expected: ['hey', 'there']
}

const globalVars = {
    program: `var x = 1;
    function f() {
        return x;
    }`,
    functionApplication: `f()`,
    expected: 1
}

module.exports = {
    simpleFunctionNothing: simpleFunctionNothing,
    nestedFunctionCallNothing: nestedFunctionCallNothing,
    simpleFunctionCallNoReturn: simpleFunctionCallNoReturn,
    simpleFunctionCallWithReturn: simpleFunctionCallWithReturn,
    functionCallWithOneParameter: functionCallWithOneParameter,
    functionCallsWithMultipleParameters: functionCallsWithMultipleParameters,
    nestedFunctionCallsWithMultipleParameters: nestedFunctionCallsWithMultipleParameters,
    badOrderFunctions: badOrderFunctions,
    varaibleAndFunctionNameError: varaibleAndFunctionNameError,
    complexFunction: complexFunction,
    negativeNumber: negativeNumber,
    stringVariable: stringVariable,
    consoleLogging: consoleLogging,
    comments: comments,
    errorThrowing: errorThrowing,
    recursion: recursion,
    earlyReturn: earlyReturn,
    ifStatement: ifStatement,
    arrayFunctions: arrayFunctions,
    objectKeys: objectKeys,
    globalVars: globalVars
}