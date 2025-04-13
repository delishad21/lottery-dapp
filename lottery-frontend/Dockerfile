FROM node:18-alpine

WORKDIR /app

# Install static file server
RUN npm install -g serve

# Copy built app into container (assumes you've run `npm run build`)
COPY dist /app

# Expose port 5205 to outside
EXPOSE 5205

# Serve app on port 5205
CMD ["serve", "-s", ".", "-l", "5205"]

