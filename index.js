const express = require('express');
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
        // await client.connect();
        console.log("Connected to MongoDB!");

        const jobCollection = client.db('hirely-job-portal').collection('jobs');
        const courseCollection = client.db('hirely-job-portal').collection('courses');
        const companyCollection = client.db('hirely-job-portal').collection('companies');
        const userCollection = client.db('hirely-job-portal').collection('users');
        const coursecategoryCollection = client.db('hirely-job-portal').collection('course-category');

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

        app.get('/course-category', async (req, res) => {
            try {
                const result = await coursecategoryCollection.find().toArray();
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