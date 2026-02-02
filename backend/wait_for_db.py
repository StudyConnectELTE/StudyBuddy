import time
import pymysql

def wait_for_db():
    while True:
        try:
            conn = pymysql.connect(
                host="db",
                port=3306,
                user="user",
                password="password",
                database="studybuddy",
            )
            conn.close()
            print("Database is ready.")
            break
        except pymysql.OperationalError:
            print("Database is not ready yet, waiting...")
            time.sleep(2)

if __name__ == "__main__":
    wait_for_db()
