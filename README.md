# How to run-
Before you begin, check if Docker is installed properly. Example-
>> docker --version
Docker version 28.3.2, build 578ccf6
>> docker compose version
Docker Compose version v2.38.2-desktop.1

If you have Docker Desktop, make sure that app is running.

* STEP 1: Goto project root '/dada_prod'

* STEP 2: Run-
>> docker compose up --build -d
This will build the images from scratch and run it, in detached mode.
# Access services
Frontend: http://localhost:80
Backend: http://localhost:4000

* STEP 3: To bring the containers down,
>> docker compose down
If you wish to just stop the containers,
>> docker compose stop
