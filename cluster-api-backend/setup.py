from setuptools import setup, find_packages

setup(
    name="cluster-api-backend",
    version="0.1.0",
    packages=find_packages(where="src"),
    package_dir={"": "src"},
    install_requires=[
        "flask",
        "flask-sqlalchemy",
        "flask-migrate",
        "flask-cors",
        "python-dotenv",
    ],
    python_requires=">=3.8",
)
