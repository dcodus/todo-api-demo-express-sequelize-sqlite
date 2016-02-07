var express = require("express");
var bodyParser = require("body-parser");
var app = express();
var PORT = process.env.PORT || 3000;
var db = require("./db.js");
var bcrypt = require("bcrypt");

//Use bodyParser to parse data
app.use(bodyParser.json());
//Our root
app.get("/", (req, res)=> {
    res.send("Todo API Root");
});
//GET /todos all todos
app.get("/todos", (req, res)=> {
    //Use the built-in .json() method to send back our data in JSON format.
    var query = req.query;
    var where = {};
    if (query.completed) {
        where.completed = query.completed === "true" ? true : false
    }
    if (query.description) {
        where.description = {
            $like: `%${query.description}%`
        }
    }
    db.todo.findAll({where: where}).then((todos)=> {
        todos.length > 0 ? res.json(todos) : res.status(404).send("No matches found");
    }).catch((e)=> {
        return res.json(e);
    })
});
//GET /todos/:id get individual todo
app.get("/todos/:id", (req, res)=> {
    //Use sequelize findById to retrieve a match
    db.todo.findById(Number(req.params.id)).then((todo)=> {
        todo ? res.json(todo) : res.status(404).send("Todo not found.")
    }).catch((e)=> {
        return res.json(e);
    })
});
//POST /todos new todo
app.post("/todos", (req, res)=> {

    var newTodo = {};
    if (req.body.description) {
        newTodo.description = req.body.description
    }
    if (req.body.completed) {
        newTodo.completed = req.body.completed
    }

    db.todo.create(newTodo).then((todo)=> {
        return res.json(todo);
    }).catch((e)=> {
        return res.status(400).json(e);
    });

});
//DELETE /todos/:id delete todo by id
app.delete("/todos/:id", (req, res)=> {

    db.todo.destroy({
        where: {
            id: Number(req.params.id)
        }
    }).then((rowsDeleted)=> {
        if (rowsDeleted === 0) {
            res.status(404).send("No match found.")
        } else {
            res.status(204).send("Todo deleted.")
        }
    }).catch((e)=> {
        res.json(e);
    })
});
//PUT /todos/id
app.put("/todos/:id", (req, res)=> {

    var update = {};

    if (req.body.description) {
        update.description = req.body.description
    }
    if (req.body.completed) {
        update.completed = req.body.completed
    }

    db.todo.findById(Number(req.params.id))
        .then((todo)=> {
            if (todo) {
                return todo.update(update)
            } else {
                return res.status(404).send("No match found.")
            }
            //Notice how we pass a second argument to our then() call
        }, ()=> {
            res.status(500).send();
        }).then((todo)=> {
        res.json(todo.toJSON());
    }, (e)=> {
        res.status(400).json(e);
    })
});
//POST /users/
app.post("/users", (req, res)=> {
    var newUser = {};
    //Create new user only with the email and password fields
    if (req.body.email) {
        newUser.email = req.body.email
    }
    if (req.body.password) {
        newUser.password = req.body.password
    }
    db.user.create(newUser).then((user)=> {
        //We use user.toPublicJSON which was defined in user.js to only send back specific data. toPublicJSON() is a
        // function created under the instanceMethods of the user model.
        return res.json(user.toPublicJSON());
    }).catch((e)=> {
        return res.status(400).json(e);
    });
});

//POST /users/login
app.post("/users/login", (req, res)=> {
    var loginUser = {};
    if (typeof req.body.email === "string") {
        loginUser.email = req.body.email
    }
    if (typeof req.body.password === "string") {
        loginUser.password = req.body.password
    }
    console.log(loginUser);
    db.user.authentication(loginUser).then((user)=> {
        //The token will be sent in the header.
        var token = user.generateToken("authentication");

        if (token) {
            res.header("Auth", token).json(user.toPublicJSON());
        } else {
            return res.status(401).send("Authentication failed.")
        }
    }, ()=> {
        res.status(401).send("Authentication failed.")
    });
});
db.sequelize.sync({force: true}).then(()=> {
    app.listen(PORT, ()=> {
        console.log(`Express listening on port ${PORT}`)
    });
});