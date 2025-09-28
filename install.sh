#!/bin/bash

if which brew >/dev/null 2>&1; then #Mac
    brew install mariadb
    mysql.server start
else
	/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
    brew install mariadb
    mysql.server start
fi

if which apt >/dev/null 2>&1; then #On ubuntu or ubuntu-based distro I think I dunno
    sudo apt install mariadb-server
fi

if which pacman >/dev/null 2>&1; then #Arch I think
    sudo pacman -S mariadb
    sudo mariadb-install-db --user=mysql --basedir=/usr --datadir=/var/lib/mysql
fi

echo "Consider creating a secure install and setup a user with a password"

wait 3

npm i

cd server

npm i

cd ..

npm run server

echo "Installed!"