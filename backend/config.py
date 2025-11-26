import os

class Config:
    SQLALCHEMY_DATABASE_URI = "mysql+pymysql://user:password@db:3306/studybuddy"
    SQLALCHEMY_TRACK_MODIFICATIONS = False
    SECRET_KEY = "super-secret-key"
