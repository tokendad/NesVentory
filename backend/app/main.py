from fastapi import FastAPI
app=FastAPI(title='InvenTree API')
@app.get('/')
def root(): return {'message':'Welcome to InvenTree'}