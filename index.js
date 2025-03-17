const express = require('express');
const app = express();
const cors = require('cors');
const port = process.env.PORT || 5000;
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
require('dotenv').config();
const bcrypt = require('bcrypt');

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
        const appliedCollection = client.db('hirely-job-portal').collection('applied');

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
        app.post('/followcompany', async (req, res) => {
            const { email, companyId } = req.body; // Extract email and companyId from the request body
        
            // Validate input
            if (!email || !companyId) {
                return res.status(400).json({ message: 'Email and companyId are required' });
            }
        
            try {
                // Find the company by companyId
                const company = await companyCollection.findOne({ _id: new ObjectId(companyId) });
                if (!company) {
                    return res.status(404).json({ message: 'Company not found' });
                }
        
                // Add the user's email to the company's followers array
                await companyCollection.updateOne(
                    { _id: new ObjectId(companyId) },
                    { $addToSet: { followers: email } } // Use $addToSet to avoid duplicates
                );
        
                // Find the user by email
                const user = await userCollection.findOne({ email });
                if (!user) {
                    return res.status(404).json({ message: 'User not found' });
                }
        
                // Add the companyId to the user's followedCompanies array
                await userCollection.updateOne(
                    { email },
                    { $addToSet: { followedCompanies: companyId } } // Use $addToSet to avoid duplicates
                );
        
                res.status(200).json({ message: 'Company followed successfully' });
            } catch (error) {
                console.error('Error following company:', error);
                res.status(500).json({ message: 'Internal server error' });
            }
        });
        app.get('/companyfollowedbyuser/:email', async (req, res) => {
            const email = req.params.email; // Extract email from the route parameter
        
            // Validate input
            if (!email) {
                return res.status(400).json({ message: 'Email is required' });
            }
        
            try {
                // Find the user by email
                const user = await userCollection.findOne({ email });
                if (!user) {
                    return res.status(404).json({ message: 'User not found' });
                }
        
                // Get the followedCompanies array from the user object
                const followedCompanies = user.followedCompanies || [];
        
                // If the user is not following any companies, return an empty array
                if (followedCompanies.length === 0) {
                    return res.status(200).json([]);
                }
        
                // Convert company IDs to ObjectId
                const companyIds = followedCompanies.map(id => new ObjectId(id));
        
                // Find the companies using the company IDs
                const companies = await companyCollection.find({
                    _id: { $in: companyIds }
                }).toArray();
        
                // Send the list of companies to the frontend
                res.status(200).json(companies);
            } catch (error) {
                console.error('Error fetching followed companies:', error);
                res.status(500).json({ message: 'Internal server error' });
            }
        });
        app.post('/unfollowcompany', async (req, res) => {
            const { email, companyId } = req.body; // Extract email and companyId from the request body
        
            // Validate input
            if (!email || !companyId) {
                return res.status(400).json({ message: 'Email and companyId are required' });
            }
        
            try {
                // Find the company by companyId
                const company = await companyCollection.findOne({ _id: new ObjectId(companyId) });
                if (!company) {
                    return res.status(404).json({ message: 'Company not found' });
                }
        
                // Remove the user's email from the company's followers array
                await companyCollection.updateOne(
                    { _id: new ObjectId(companyId) },
                    { $pull: { followers: email } } // Use $pull to remove the email
                );
        
                // Find the user by email
                const user = await userCollection.findOne({ email });
                if (!user) {
                    return res.status(404).json({ message: 'User not found' });
                }
        
                // Remove the companyId from the user's followedCompanies array
                await userCollection.updateOne(
                    { email },
                    { $pull: { followedCompanies: companyId } } // Use $pull to remove the companyId
                );
        
                res.status(200).json({ message: 'Company unfollowed successfully' });
            } catch (error) {
                console.error('Error unfollowing company:', error);
                res.status(500).json({ message: 'Internal server error' });
            }
        });
        app.post('/update-user-details', async (req, res) => {
            const { email, dataType, data } = req.body; // Extract email, dataType, and data from request body
        
            // Validate input
            if (!email || !dataType || !data) {
                return res.status(400).json({ message: 'Email, dataType, and data are required' });
            }
        
            try {
                // Find the user by email
                const user = await userCollection.findOne({ email });
        
                if (!user) {
                    return res.status(404).json({ message: 'User not found' });
                }
        
                let updateQuery = {};
        
                if (dataType === 'WorkExp' || dataType === 'KeySkills') {
                    // Handle WorkExp and KeySkills differently: Append to the existing array
                    const existingData = user.UserDescription?.[dataType] || []; // Get existing data or initialize as empty array
                    const updatedData = [...existingData, data]; // Append the new data
        
                    updateQuery[`UserDescription.${dataType}`] = updatedData; // Update the array
                } else {
                    // For other data types, overwrite the existing data
                    updateQuery[`UserDescription.${dataType}`] = data;
                }
        
                // Update the user document
                const result = await userCollection.updateOne(
                    { email }, // Filter by email
                    { $set: updateQuery } // Update operation
                );
        
                if (result.modifiedCount === 1) {
                    res.status(200).json({ message: `User ${dataType} updated successfully` });
                } else {
                    res.status(500).json({ message: `Failed to update user ${dataType}` });
                }
            } catch (error) {
                console.error(`Error updating user ${dataType}:`, error);
                res.status(500).json({ message: 'Internal server error' });
            }
        });
        app.get('/users', async (req, res) => {
            try {
                const result = await userCollection.find().toArray();
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
        app.get('/applied', async (req, res) => {
            try {
                const result = await appliedCollection.find().toArray();
                res.send(result);
            } catch (error) {
                console.error("Error fetching jobs:", error);
                res.status(500).send("Internal Server Error");
            }
        });

        app.delete('/applied/:id', async (req, res) => {
            try {
                const id = req.params.id;
                const query = { _id: new ObjectId(id) };
                const result = await appliedCollection.deleteOne(query);
                res.send(result);
            } catch (error) {
                res.status(500).send({ message: 'Internal Server Error' });
            }
        });
        
        app.post('/applied', async (req, res) => {
            try {
                const cartItem = req.body;
                const result = await appliedCollection.insertOne(cartItem);
                res.send(result);
            } catch (error) {
                res.status(500).send({ message: 'Internal Server Error' });
            }
        });

        app.patch("/applied/:id", async (req, res) => {
            const { id } = req.params;
            const { status } = req.body;
            const result = await appliedCollection.updateOne(
                { applyId: id }, 
                { $set: { status: status } }
            );
        
            if (result.modifiedCount > 0) {
                res.json({ status });
            } else {
                res.status(400).json({ message: "Update failed" });
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

        app.post('/register', async (req, res) => {
            const { name, phoneNumber, email, password, userRoll } = req.body;

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
        app.post('/login', async (req, res) => {
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