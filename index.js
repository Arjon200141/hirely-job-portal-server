const express = require('express');
const bcrypt = require('bcrypt');
const app = express();
const cors = require('cors');
const port = process.env.PORT || 5000;
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config();

app.use(cors());
app.use(express.json());

const uri = "mongodb+srv://hirely-job-portal:HKMWexa1yBb2yzXZ@cluster0.ej6qyrh.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0";

const client = new MongoClient(uri, {
    serverApi: {
        version: ServerApiVersion.v1,
        strict: true,
        deprecationErrors: true,
    }
});

async function run() {
    try {
        await client.connect();
        console.log("Connected to MongoDB!");

        const jobCollection = client.db('hirely-job-portal').collection('jobs');
        const courseCollection = client.db('hirely-job-portal').collection('courses');
        const companyCollection = client.db('hirely-job-portal').collection('companies');
        const userCollection = client.db('hirely-job-portal').collection('users');

        // Get all jobs
        app.get('/jobs', async (req, res) => {
            try {
                const result = await jobCollection.find().toArray();
                res.send(result);
            } catch (error) {
                console.error("Error fetching jobs:", error);
                res.status(500).send("Internal Server Error");
            }
        });

        app.get('/companies', async (req, res) => {
            try {
                const result = await companyCollection.find().toArray();
                res.send(result);
            } catch (error) {
                console.error("Error fetching jobs:", error);
                res.status(500).send("Internal Server Error");
            }
        });

        // Get a single job by ID
        app.get('/jobs/:id', async (req, res) => {
            try {
                const id = req.params.id;

                // Validate the ID
                if (!ObjectId.isValid(id)) {
                    return res.status(400).send("Invalid job ID");
                }

                const query = { _id: new ObjectId(id) };
                const result = await jobCollection.findOne(query);

                if (!result) {
                    return res.status(404).send("Job not found");
                }

                res.send(result);
            } catch (error) {
                console.error("Error fetching job:", error);
                res.status(500).send("Internal Server Error");
            }
        });
        app.get('/companies/:id', async (req, res) => {
            try {
                const id = req.params.id;

                // Validate the ID
                if (!ObjectId.isValid(id)) {
                    return res.status(400).send("Invalid job ID");
                }

                const query = { _id: new ObjectId(id) };
                const result = await companyCollection.findOne(query);

                if (!result) {
                    return res.status(404).send("Job not found");
                }

                res.send(result);
            } catch (error) {
                console.error("Error fetching job:", error);
                res.status(500).send("Internal Server Error");
            }
        });

        app.get("/courses", async (req, res) => {
            try {
                const { category } = req.query; // Extract the category from query parameters
                let query = {}; // Initialize an empty query object
        
                // If a category is provided, filter by category
                if (category) {
                    query.category = category.toUpperCase(); // Ensure the category is in uppercase
                }
        
                // Fetch courses based on the query and sort by learners in descending order
                const result = await courseCollection
                    .find(query)
                    .sort({ learners: -1 }) // Sort by learners in descending order
                    .toArray();
        
                res.send(result); // Send the response
            } catch (error) {
                console.error("Error fetching courses:", error);
                res.status(500).send("Internal Server Error");
            }
        });
        app.get("/courses/:id", async (req, res) => {
            const id = req.params.id;
      
            // console.log('cookies : ',req.cookies);
            const query = { _id: new ObjectId(id) };
            const course = await courseCollection.findOne(query);
            res.send(course)
          })

          app.post('/api/register', async (req, res) => {
            const { name, phoneNumber, email, password,userRoll } = req.body;

            // Validate input data
            if (!name || !phoneNumber || !email || !password) {
                return res.status(400).json({ message: 'All fields are required.' });
            }

            // Check if the email already exists
            const existingUser = await userCollection.findOne({ email });
            if (existingUser) {
                return res.status(400).json({ message: 'Email already exists.' });
            }

            // Create user object (password is already hashed in the frontend)
            const user = {
                name,
                phoneNumber,
                email,
                password,
                userRoll, // Use the already hashed password from the frontend
                createdAt: new Date(),
            };

            // Insert user into the database
            const result = await userCollection.insertOne(user);

            // Send response
            res.status(201).json({
                message: 'User registered successfully!',
                userId: result.insertedId,
            });
        });
        app.post('/api/login', async (req, res) => {
            const { email, phoneNumber, password } = req.body;
        
            // Validate input data
            if ((!email && !phoneNumber) || !password) {
                return res.status(400).json({ message: 'Email/phone number and password are required.' });
            }
        
            try {
                // Find the user by email or phone number
                const user = await userCollection.findOne({
                    $or: [{ email }, { phoneNumber }],
                });
        
                if (!user) {
                    return res.status(404).json({ message: 'User not found.' });
                }
        
                // Compare the provided password with the stored hashed password
                const isPasswordValid = await bcrypt.compare(password, user.password);
        
                if (!isPasswordValid) {
                    return res.status(401).json({ message: 'Invalid password.' });
                }
        
                // If everything is valid, return a success response
                console.log(user);
                res.status(200).json({
                    message: 'Login successful!',
                    user: {
                        name: user.name,
                        email: user.email,
                        phoneNumber: user.phoneNumber,
                        userRoll: user.userRoll,
                    },
                });
            } catch (error) {
                console.error('Error during login:', error);
                res.status(500).json({ message: 'An error occurred during login.' });
            }
        });
        
  

        console.log("Pinged your deployment. You successfully connected to MongoDB!");
    } catch (error) {
        console.error("Error connecting to MongoDB:", error);
    }
}

run().catch(console.dir);

app.get('/', (req, res) => {
    res.send('Hirely Job Portal is running');
});

app.listen(port, () => {
    console.log(`Hirely Job Portal is running on port ${port}`);
});