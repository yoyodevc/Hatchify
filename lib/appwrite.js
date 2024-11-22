import { Account, Client, ID, Avatars, Databases } from 'appwrite';

export const appwriteConfig = {
    endpoint: 'https://cloud.appwrite.io/v1',
    projectID: '66e6faec000a0ca7d143',
    databaseId: '66e6ffff003087d23aa1',
    userCollectionId: '66e700e50007de2c1beb',
    storageId: '66e7027c0038b5e3f885'
};

const client = new Client()
    .setEndpoint(appwriteConfig.endpoint)
    .setProject(appwriteConfig.projectID);

const account = new Account(client);
const avatars = new Avatars(client);
const databases = new Databases(client);

export const createUser = async (email, password, username) => {
    try {
        const userId = ID.unique();  

        
        const newAccount = await account.create(userId, email, password, username);
        console.log("New account created:", newAccount);

        const avatarUrl = avatars.getInitials(username);

        
        const newUser = await databases.createDocument(
            appwriteConfig.databaseId,
            appwriteConfig.userCollectionId,
            userId,
            {
                title: username,            
                accountid: newAccount.$id,   
                email,
                username,
                avatar: avatarUrl,
            }
        );

        console.log("User document created:", newUser);
        return newUser;
    } catch (error) {
        console.error("Error creating user:", error.message);
        throw new Error(error.message);
    }
};

export const signIn = async (email, password) => {
    try {
        
        const session = await account.createOAuth2Session(email, password);
        console.log("Login successful:", session);
        return session;
    } catch (error) {
        console.error('Error during login:', error.message);
        throw error;
    }
};


export const getCurrentUser = async () => {
    try{
        
        const currentAccount = await account.get();

        if(!currentAccount) throw Error;

        const currentUser = await databases.listDocuments(
            config.databaseId,
            config.userCollectionId,
            [Query.equal('accountid', currentAccount.$id)]
        )

        if(!currentUser) throw Error;

        return currentUser.documents[0];
    } catch (error) {
        console.log(error)
    }
}