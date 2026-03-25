# Stage 1: Build the React Application
FROM node:20-alpine as build
WORKDIR /app

# Accept ARGs passed from docker-compose
ARG VITE_API_BASE_URL
ARG VITE_GOOGLE_MAPS_API_KEY

# Set them as ENV so Vite bakes them into the build
ENV VITE_API_URL=$VITE_API_BASE_URL
ENV VITE_GOOGLE_MAPS_API_KEY=$VITE_GOOGLE_MAPS_API_KEY

# Install dependencies
COPY package*.json ./
RUN npm install

# Build application
COPY . .
RUN npm run build

# Stage 2: Serve with Nginx
FROM nginx:alpine

# Copy built assets
COPY --from=build /app/dist /usr/share/nginx/html

# Replace default Nginx configuration for Client-Side Routing (SPA)
RUN printf 'server {\n\
    listen 80;\n\
    location / {\n\
        root /usr/share/nginx/html;\n\
        index index.html index.htm;\n\
        # Support React Router by falling back to index.html\n\
        try_files $uri $uri/ /index.html;\n\
    }\n\
}\n' > /etc/nginx/conf.d/default.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
