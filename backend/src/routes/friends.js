// TODO: Add schema validation and error handling for each route
export default async function (fastify, opts) {
    // Gets a list of the current user's friends and their status.
    fastify.get('/', async (request, reply) => {
        // Logic to get the current user's friends list
        // This should return a list of friends for the authenticated user
        return { message: 'Friends list data' };
    });

    // Sends a friend request to another user.
    fastify.post('/', async (request, reply) => {
        // Logic to add a new friend
        // This should accept a user ID or username to add as a friend
        // TIP: Always store the lower ID first to avoid duplicates
        return { message: 'Friend added successfully' };
    });

    // Removes a friend.
    fastify.delete('/:id', async (request, reply) => {
        const friendId = request.params.id;
        // Logic to remove a friend by ID
        // This should remove the specified friend from the authenticated user's friends list
        return { message: `Friend with ID ${friendId} removed successfully` };
    });
}
