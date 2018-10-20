// f(): undefined
const simpleFunctionNothing = {
    program: `function f () {
    }
    module.exports = {
        f: f
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
    }
    module.exports = {
        g: g
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
    }
    module.exports = {
        f: f
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
    }
    module.exports = {
        f: f
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
    }
    module.exports = {
        f: f
    }`,
    functionApplication: `f(5)`,
    expected: 10
}
    
// isSquareRootOf(2, 3): false
const functionCallsWithMultipleParameters = {
    program: `function isSquareRootOf(x, n) {
        return x * x == n;
    }
    module.exports = {
        isSquareRootOf: isSquareRootOf
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
    }
    module.exports = {
        isSquareRootOf: isSquareRootOf
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
    }
    module.exports = {
        g: g
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
    }
    module.exports = {
        g: g
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
    }
    module.exports = {
        call: call
    }`,
    functionApplication: `call(5, 6, 7)`,
    expected: -155
}

// f(): -1
const negativeNumber = {
    program: `function f() {
        return -1;
    }
    module.exports = {
        f: f
    }`,
    functionApplication: `f()`,
    expected: -1
}
    
// f(): hey there
const stringVariable = {
    program: `function f(s) {
        return 'hey ' + s;
    }
    module.exports = {
        f: f
    }`,
    functionApplication: `f('there')`,
    expected: 'hey there'
}
    
// f(): just prints out the text
const consoleLogging = {
    program: `function f() {
        console.log('printing stuff only');
        return 1;
    }
    module.exports = {
        f: f
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
    }
    module.exports = {
        f: f
    }`,
    functionApplication: `f()`,
    expected: 0
}
    
// f(): throws error Some error
const errorThrowing = {
    program: `function f() {
        throw new Error('error');
        return 1;
    }
    module.exports = {
        f: f
    }`,
    functionApplication: `f()`,
    expected: 'error'
}

// f(1): prints out 1..10
const recursion = {
    program: `function f(x) {
        console.log(x);
        return x == 10 || f(x+1);
    }
    module.exports = {
        f: f
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
    }
    module.exports = {
        f: f
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
    }
    module.exports = {
        f: f
    }`,
    functionApplication: `f(0, 2)`,
    expected: 2
}

const arrayFunctions = {
    program: `function f(a) {
        var x = [a, a, a, 4]; 
        return x.length + x[3];
    }
    module.exports = {
        f: f
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
    }
    module.exports = {
        f: f
    }`,
    functionApplication: `f()`,
    expected: ['hey', 'there']
}

const globalVars = {
    program: `var x = 1;
    function f() {
        return x;
    }
    module.exports = {
        f: f
    }`,
    functionApplication: `f()`,
    expected: 1
}

const forLoops = {
    program: `function f() {
        let sum = 0;
        for(let i=0; i<4; i=i+1) {
            sum = sum + i;
        }
        return sum;
    }
    module.exports = {
        f: f
    }`,
    functionApplication: `f()`,
    expected: 6
}

const moduleExports = {
    program: `function f() {
        return 1;
    }
    module.exports = {
        f: f
    }`,
    functionApplication: `f()`,
    expected: 1
}

const moduleExportsError = {
    program: `function f() {
        return 1;
    }
    module.exports = {
    }`,
    functionApplication: `f()`,
    expected: 'error'
}

const breakLoop = {
    program: `function f(x) {
        for(let i=0; i<4; i=i+1) {
            x = x + i;
            break;
        }
        return x;
    }
    module.exports = {
        f: f
    }`,
    functionApplication: `f(2)`,
    expected: 2
}

const switchStatements = {
    program: `function f(x) {
        switch(x) {
            case 1:
                x = x + 1;
            case 2:
                x = x + 2;
                break;
            default:
                x = x + 3;
        }
        return x;
    }
    
    module.exports = {
        f: f
    }`,
    functionApplication: `f(1)`,
    expected: 5
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
    globalVars: globalVars,
    forLoops: forLoops,
    moduleExports: moduleExports,
    breakLoop: breakLoop,
    switchStatements: switchStatements
}