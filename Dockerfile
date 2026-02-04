# Use the official Node.js image with Chromium dependencies
FROM ghcr.io/puppeteer/puppeteer:latest

USER root

# Set working directory
WORKDIR /app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install

# Copy the rest of the application
COPY . .

# Build the application
# Note: we need to make sure build command works in this environment
RUN npm run build

# Expose the port the app runs on
EXPOSE 3000

# Set environment variables for production
ENV NODE_ENV=production
ENV PORT=3000

# Start the application
CMD ["npm", "start"]
