from sqlalchemy import String, ForeignKey
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, EntityMixin


class Organization(Base, EntityMixin):
    __tablename__ = "organizations"

    name: Mapped[str] = mapped_column(String(200), nullable=False)
    mission: Mapped[str] = mapped_column(String(1000), nullable=True)

    units: Mapped[list["OrganizationUnit"]] = relationship(back_populates="organization")


class OrganizationUnit(Base, EntityMixin):
    """A sub-part of an organization (e.g. a team or department)."""
    __tablename__ = "organization_units"

    name: Mapped[str] = mapped_column(String(200), nullable=False)
    organization_id: Mapped[str] = mapped_column(ForeignKey("organizations.id"), nullable=False)

    organization: Mapped["Organization"] = relationship(back_populates="units")
