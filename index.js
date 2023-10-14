const express = require('express');
const cors = require('cors');
const app = express();
require('dotenv').config();
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const port = process.env.port || 5000;
const stripe = require("stripe")(process.env.STRIPE_SECRET_KEY)

const uri = `mongodb+srv://${process.env.USER_Name}:${process.env.PASSWORD}@cluster0.bqstehg.mongodb.net/?retryWrites=true&w=majority`;

// middleware
app.use(express.json());
app.use(cors());

// server starts
app.get('/', (req, res) => {
    res.send("A&FElegance server is running...")
});

// Verify JWT
const verifyJWT = (req, res, next) => {
    const authorization = req.headers.authorization;

    if (!authorization) {
        return res.status(401).send({ error: "Unauthorized access!" });
    }

    const token = authorization.split(" ")[1];
    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (error, decoded) => {
        if (error) {
            return res.status(403).send({ error: "Unauthorized access!" });
        }

        req.decoded = decoded;
        next();
    });
};

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

async function run() {
    try {
        // Connect the client to the server	(optional starting in v4.7)
        await client.connect();

        // Collections
        const usersCollection = client.db("afElegance").collection("users");
        const productsCollection = client.db("afElegance").collection("products");
        const reviewsCollection = client.db("afElegance").collection("reviews");
        const favouritesCollection = client.db("afElegance").collection("favourite");
        const cartsCollection = client.db("afElegance").collection("carts");
        const paymentsCollection = client.db("afElegance").collection("payments");

        // user related API
        app.get("/all-users", async (req, res) => {
            const result = await usersCollection.find().toArray();
            res.send(result);
        });

        app.get("/users/admin/:email", async (req, res) => {
            const email = req.params.email;
            // const decodedEmail = req.decoded.email;

            // if (email !== decodedEmail) {
            //     return res.status(403).send({ error: "Forbidden access" });
            // }
            const query = { email: email };
            const user = await usersCollection.findOne(query);
            const result = { admin: user?.role === "admin" }
            res.send(result);
        });

        app.post("/add-users", async (req, res) => {
            const user = req.body;
            const query = { email: user.email };
            const existingUser = await usersCollection.findOne(query);

            if (existingUser) {
                return res.send({ message: "User already exist" });
            }
            // console.log("user", user);
            const result = await usersCollection.insertOne(user);
            res.send(result);
        });

        app.patch('/users/admin/:id', async (req, res) => {
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) };
            const updateDoc = {
                $set: {
                    role: 'admin'
                },
            };
            const result = await usersCollection.updateOne(filter, updateDoc);
            res.send(result);
        });

        app.delete('/users/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const result = await usersCollection.deleteOne(query);
            res.send(result);
        })

        // products related API
        app.get("/mens", async (req, res) => {
            const query = { type: "Men" }
            const result = await productsCollection.find(query).toArray();
            res.send(result);
        })

        app.get("/product/:id", async (req, res) => {
            const id = req.params.id;
            // console.log(id);
            const query = { _id: new ObjectId(id) }
            const result = await productsCollection.find(query).toArray();
            res.send(result);
        })

        app.get("/womens", async (req, res) => {
            const query = { type: "Women" }
            const result = await productsCollection.find(query).toArray();
            res.send(result);
        })

        app.get("/kids", async (req, res) => {
            const query = { type: "Kid" }
            const result = await productsCollection.find(query).toArray();
            res.send(result);
        })

        app.get('/sales', async (req, res) => {
            const query = { sales: { $gt: 0, $lt: 40 } };
            const result = await productsCollection.find(query).limit(10).toArray();
            res.send(result);
        })

        app.get('/bestSales', async (req, res) => {
            const query = { bestSales: "Yes" }
            const result = await productsCollection.find(query).limit(10).toArray();
            res.send(result);
        })

        app.get('/all-products', async (req, res) => {
            const result = await productsCollection.find().toArray();
            res.send(result);
        })

        // app.get('/getPaidData/:email', async( req, res) =>{
        //     const email = req.params.email;
        //     const query = {email : email}
        //     const result = await paymentsCollection.find(query).toArray();
        //     res.send(result)
        // })

        // TODO: verify Admin
        app.put('/edit-Product/:id', async (req, res) => {
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) };
            const options = { upsert: true };
            const updatedProduct = req.body;
            const product = {
                $set: {
                    category: updatedProduct.category,
                    dressTitle: updatedProduct.dressTitle,
                    sales: updatedProduct.sales,
                    bestSales: updatedProduct.bestSales,
                    length: updatedProduct.length,
                    price: updatedProduct.price,
                    size: updatedProduct.size,
                    stock: updatedProduct.stock,
                    style: updatedProduct.style,
                    type: updatedProduct.type,

                }
            };
            const result = await productsCollection.updateOne(filter, product, options);
            res.send(result);
        })

        app.post("/add-review-product/:id", async (req, res) => {
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) };
            const options = { upsert: true };
            const productReview = req.body;
            const review = {
                $push: {
                    reviews:{ 
                        $each: [
                            productReview
                        ]
                    }
                }
            }
            const result = await productsCollection.updateOne(filter, review, options);
            res.send(result);
        })

        // TODO: verify Admin
        app.post("/add-product", async (req, res) => {
            const product = req.body;
            const result = await productsCollection.insertOne(product);
            res.send(result)
        })

        // TODO: verify Admin
        app.delete('/delete-products/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const result = await productsCollection.deleteOne(query);
            res.send(result);
        })

        // review related API
        app.get("/get-review", async (req, res) => {
            const result = await reviewsCollection.find().toArray();
            res.send(result);
        });

        app.post("/add-review", async (req, res) => {
            const email = req.body.email;
            const review = req.body;
            // const decodedEmail = req.decoded.email;

            // if (email !== decodedEmail) {
            //     return res.status(403).send({ error: "forbidden access" });
            // }
            const result = await reviewsCollection.insertOne(review);
            res.send(result);
        });

        // Cart related API
        app.get('/carts/:email', async (req, res) => {
            const email = req.params.email;
            if (!email) {
                res.send([]);
            }
            const query = { UserEmail: email };
            const result = await cartsCollection.find(query).toArray();
            res.send(result);
        })

        app.post('/carts', async (req, res) => {
            const items = req.body;
            const result = await cartsCollection.insertOne(items);
            res.send(result);
        })

        app.delete("/carts/:id", async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const result = await cartsCollection.deleteOne(query);
            res.send(result)
        })

        // Payment related API

        app.get('/get-payment/:email', async (req, res) => {
            const email = req.params.email;
            const query = { email: email };
            const result = await paymentsCollection.find(query).toArray()
            res.send(result);
        })

        app.post('/create-payment-intent', async (req, res) => {
            const { price } = req.body;
            // console.log(price);
            const amount = parseFloat((price * 100).toFixed(2));
            const paymentIntent = await stripe.paymentIntents.create({
                amount: amount,
                currency: "usd",
                payment_method_types: ["card"],
            });
            res.send({
                clientSecret: paymentIntent.client_secret
            });
        });

        app.post("/payment", async (req, res) => {
            const payment = req.body;
            const result = await paymentsCollection.insertOne(payment);
            const query = { UserEmail: payment?.email }
            // console.log(query);
            const deleteResult = await cartsCollection.deleteMany(query)
            // console.log(deleteResult);
            res.send({ result, deleteResult });
        });

        // favourite Product relatedAPI
        app.get('/favourites/:email', async (req, res) => {
            const email = req.params.email;
            if (!email) {
                res.send([]);
            }
            const query = { UserEmail: email };
            const result = await favouritesCollection.find(query).toArray();
            res.send(result);
        })

        app.post('/favourites', async (req, res) => {
            const items = req.body;
            const result = await favouritesCollection.insertOne(items);
            res.send(result);
        })

        app.delete("/favourites/:id", async (req, res) => {
            const id = req.params.id;
            const query = { _id: new ObjectId(id) };
            const result = await favouritesCollection.deleteOne(query);
            res.send(result)
        })

        // JWT related api
        app.post("/jwt", async (req, res) => {
            const user = req.body;
            const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
                expiresIn: "10h",
            });
            res.send({ token });
        });



        // Send a ping to confirm a successful connection
        await client.db("admin").command({ ping: 1 });
        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } finally {
        // Ensures that the client will close when you finish/error
        // await client.close();
    }
}
run().catch(console.dir);


// server listen
app.listen(port, () => {
    console.log(`Server is running on port: ${port}`);
})