from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.models.user import User, UserRole
from app.schemas.auth import UserRegister, UserLogin, TokenResponse, UserOut
from app.core.security import hash_password, verify_password, create_access_token
from app.api.deps import get_current_user

router = APIRouter(prefix="/auth", tags=["Authentication"])


@router.post("/register", response_model=TokenResponse, status_code=status.HTTP_201_CREATED)
def register(user_in: UserRegister, db: Session = Depends(get_db)):
    existing = db.query(User).filter(User.email == user_in.email.lower()).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="An account with this email address already exists."
        )

    # By default, open registration creates CUSTOMER accounts.
    # Staff / Admin accounts can also be created initially or seeded.
    role = user_in.role or UserRole.CUSTOMER

    new_user = User(
        email=user_in.email.lower(),
        hashed_password=hash_password(user_in.password),
        full_name=user_in.full_name.strip(),
        phone=user_in.phone.strip() if user_in.phone else None,
        role=role,
        is_active=True
    )

    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    token = create_access_token(
        subject=new_user.id,
        role=new_user.role.value,
        extra_claims={"email": new_user.email, "name": new_user.full_name}
    )

    return TokenResponse(
        access_token=token,
        token_type="bearer",
        user=UserOut.model_validate(new_user)
    )


@router.post("/login", response_model=TokenResponse)
def login(login_in: UserLogin, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == login_in.email.lower()).first()
    if not user or not verify_password(login_in.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password."
        )

    if not user.is_active:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Account is deactivated.")

    token = create_access_token(
        subject=user.id,
        role=user.role.value,
        extra_claims={"email": user.email, "name": user.full_name}
    )

    return TokenResponse(
        access_token=token,
        token_type="bearer",
        user=UserOut.model_validate(user)
    )


@router.get("/me", response_model=UserOut)
def get_me(current_user: User = Depends(get_current_user)):
    return UserOut.model_validate(current_user)
