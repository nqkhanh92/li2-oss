# Use Node.js Alpine image for smaller size
FROM node:18-alpine

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies globally
RUN npm install -g serve

# Copy all application files
COPY . .

# Expose port 5000
EXPOSE 5000

# Start the server with serve
CMD ["serve", "-p", "5000", "--no-clipboard", "-c", "serve.json"]
