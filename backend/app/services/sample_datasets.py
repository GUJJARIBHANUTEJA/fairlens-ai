from pathlib import Path
from typing import Dict, List
import numpy as np
import pandas as pd

from backend.app.config import settings

def generate_loan_approval_dataset(n_samples: int = 1200) -> pd.DataFrame:
    """Generates realistic synthetic loan approval dataset with demographic disparities."""
    np.random.seed(settings.RANDOM_SEED)
    
    applicant_ids = [f"LN_{10000 + i}" for i in range(n_samples)]
    genders = np.random.choice(["Male", "Female", "Non-binary"], size=n_samples, p=[0.55, 0.40, 0.05])
    races = np.random.choice(["White", "Black", "Asian", "Hispanic"], size=n_samples, p=[0.50, 0.22, 0.15, 0.13])
    
    # Financial metrics with historical disparities
    annual_income = []
    credit_scores = []
    loan_amounts = []
    employment_years = []
    zip_codes = []
    approved = []
    
    for g, r in zip(genders, races):
        # Base credit score
        base_credit = np.random.normal(680, 50)
        base_income = np.random.exponential(50000) + 25000
        
        # Historical systemic income / credit distribution shifts
        if r == "Black":
            base_credit -= 35
            base_income *= 0.85
            zip_code = np.random.choice(["30301", "30310", "30315"], p=[0.2, 0.5, 0.3])
        elif r == "Hispanic":
            base_credit -= 20
            base_income *= 0.90
            zip_code = np.random.choice(["30301", "30318", "30324"], p=[0.3, 0.4, 0.3])
        elif r == "Asian":
            base_credit += 20
            base_income *= 1.15
            zip_code = np.random.choice(["30305", "30309", "30327"], p=[0.4, 0.4, 0.2])
        else:
            zip_code = np.random.choice(["30305", "30309", "30301"], p=[0.4, 0.4, 0.2])
            
        if g == "Female":
            base_income *= 0.88
            
        credit = int(np.clip(base_credit, 350, 850))
        income = int(np.clip(base_income, 18000, 250000))
        loan = int(np.clip(np.random.normal(income * 0.4, 15000), 5000, 150000))
        emp_yr = int(np.clip(np.random.exponential(6), 0, 35))
        
        # Approval probability depends strongly on credit score, income, and debt-to-income
        logit = -7.5 + (credit * 0.012) + (income / 35000) - (loan / 25000) + (emp_yr * 0.05)
        prob = 1 / (1 + np.exp(-logit))
        is_approved = int(np.random.rand() < prob)
        
        annual_income.append(income)
        credit_scores.append(credit)
        loan_amounts.append(loan)
        employment_years.append(emp_yr)
        zip_codes.append(zip_code)
        approved.append(is_approved)
        
    df = pd.DataFrame({
        "Applicant_ID": applicant_ids,
        "Gender": genders,
        "Race": races,
        "Annual_Income": annual_income,
        "Credit_Score": credit_scores,
        "Loan_Amount": loan_amounts,
        "Employment_Years": employment_years,
        "Zip_Code": zip_codes,
        "Approved": approved
    })
    return df

def generate_recruitment_dataset(n_samples: int = 1000) -> pd.DataFrame:
    """Generates realistic synthetic hiring recruitment dataset."""
    np.random.seed(settings.RANDOM_SEED + 1)
    
    candidate_ids = [f"APP_{20000 + i}" for i in range(n_samples)]
    genders = np.random.choice(["Male", "Female"], size=n_samples, p=[0.58, 0.42])
    age_groups = np.random.choice(["Under 25", "25-40", "41-55", "Over 55"], size=n_samples, p=[0.15, 0.55, 0.20, 0.10])
    education = np.random.choice(["Bachelors", "Masters", "PhD", "High School"], size=n_samples, p=[0.50, 0.30, 0.08, 0.12])
    
    exp_years = []
    interview_scores = []
    hired = []
    
    for g, age, edu in zip(genders, age_groups, education):
        base_exp = 2 if age == "Under 25" else (7 if age == "25-40" else (16 if age == "41-55" else 24))
        exp = max(0, int(np.random.normal(base_exp, 2)))
        
        score = np.random.normal(68, 14)
        if edu == "Masters":
            score += 5
        elif edu == "PhD":
            score += 8
            
        # Subtle gender disparity in technical interview grading
        if g == "Female":
            score -= 4
            
        score = float(np.clip(score, 10, 100))
        
        logit = -6.0 + (score * 0.07) + (exp * 0.08)
        prob = 1 / (1 + np.exp(-logit))
        is_hired = "Yes" if np.random.rand() < prob else "No"
        
        exp_years.append(exp)
        interview_scores.append(round(score, 1))
        hired.append(is_hired)
        
    df = pd.DataFrame({
        "Candidate_ID": candidate_ids,
        "Gender": genders,
        "Age_Group": age_groups,
        "Education_Level": education,
        "Years_Experience": exp_years,
        "Interview_Score": interview_scores,
        "Hired": hired
    })
    return df

def generate_income_dataset(n_samples: int = 1200) -> pd.DataFrame:
    """Generates synthetic Adult census style dataset."""
    np.random.seed(settings.RANDOM_SEED + 2)
    
    ages = np.random.randint(18, 70, size=n_samples)
    sexes = np.random.choice(["Male", "Female"], size=n_samples, p=[0.65, 0.35])
    races = np.random.choice(["White", "Black", "Asian-Pac-Islander", "Other"], size=n_samples, p=[0.70, 0.15, 0.10, 0.05])
    workclasses = np.random.choice(["Private", "Self-emp", "Government"], size=n_samples, p=[0.70, 0.18, 0.12])
    education_num = np.random.choice([9, 10, 13, 14, 16], size=n_samples, p=[0.30, 0.25, 0.25, 0.15, 0.05])
    hours = np.random.choice([20, 35, 40, 50, 60], size=n_samples, p=[0.1, 0.15, 0.55, 0.12, 0.08])
    
    incomes = []
    for a, s, r, e, h in zip(ages, sexes, races, education_num, hours):
        base = -8.0 + (a * 0.05) + (e * 0.35) + (h * 0.04)
        if s == "Male":
            base += 0.8
        if r == "White" or r == "Asian-Pac-Islander":
            base += 0.4
        prob = 1 / (1 + np.exp(-base))
        inc = ">50K" if np.random.rand() < prob else "<=50K"
        incomes.append(inc)
        
    df = pd.DataFrame({
        "Age": ages,
        "Sex": sexes,
        "Race": races,
        "Workclass": workclasses,
        "Education_Num": education_num,
        "Hours_Per_Week": hours,
        "Income": incomes
    })
    return df

def ensure_sample_datasets() -> Dict[str, Path]:
    """Generates and persists sample datasets if not already created."""
    samples = {
        "loan_approval": settings.SAMPLE_DIR / "loan_approval.csv",
        "recruitment_hiring": settings.SAMPLE_DIR / "recruitment_hiring.csv",
        "adult_income": settings.SAMPLE_DIR / "adult_income.csv"
    }
    
    if not samples["loan_approval"].exists():
        df_loan = generate_loan_approval_dataset()
        df_loan.to_csv(samples["loan_approval"], index=False)
        
    if not samples["recruitment_hiring"].exists():
        df_rec = generate_recruitment_dataset()
        df_rec.to_csv(samples["recruitment_hiring"], index=False)
        
    if not samples["adult_income"].exists():
        df_inc = generate_income_dataset()
        df_inc.to_csv(samples["adult_income"], index=False)
        
    return samples
