import { K, EPS2 } from './constants';

import type { Particle } from './types';

const DEFAULT_MAX_DEPTH = 16;
const DEFAULT_MIN_SIZE = 1;

class QuadTreeNode {
	boundary: { x: number; y: number; width: number; height: number };
	capacity: number;
	particles: Particle[];
	divided: boolean;
	northeast: QuadTreeNode | null;
	northwest: QuadTreeNode | null;
	southeast: QuadTreeNode | null;
	southwest: QuadTreeNode | null;
	charge: number;
	absCharge: number;
	comX: number;
	comY: number;
	depth: number;
	maxDepth: number;
	minSize: number;

	constructor(
		boundary: { x: number; y: number; width: number; height: number },
		capacity: number,
		depth: number = 0,
		maxDepth: number = DEFAULT_MAX_DEPTH,
		minSize: number = DEFAULT_MIN_SIZE
	) {
		this.boundary = boundary;
		this.capacity = capacity;
		this.particles = [];
		this.divided = false;
		this.northeast = null;
		this.northwest = null;
		this.southeast = null;
		this.southwest = null;
		this.charge = 0;
		this.absCharge = 0;
		this.comX = 0;
		this.comY = 0;
		this.depth = depth;
		this.maxDepth = maxDepth;
		this.minSize = minSize;
	}
	private isAtSubdivisionLimit(): boolean {
		const { width, height } = this.boundary;
		return this.depth >= this.maxDepth || width / 2 < this.minSize || height / 2 < this.minSize;
	}
	private insertIntoChildren(particle: Particle): boolean {
		return (
			this.northeast!.insert(particle) ||
			this.northwest!.insert(particle) ||
			this.southeast!.insert(particle) ||
			this.southwest!.insert(particle)
		);
	}
	subdivide(): boolean {
		if (this.divided || this.isAtSubdivisionLimit()) {
			return false;
		}
		const { x, y, width, height } = this.boundary;
		const ne = { x: x + width / 2, y: y, width: width / 2, height: height / 2 };
		this.northeast = new QuadTreeNode(
			ne,
			this.capacity,
			this.depth + 1,
			this.maxDepth,
			this.minSize
		);
		const nw = { x: x, y: y, width: width / 2, height: height / 2 };
		this.northwest = new QuadTreeNode(
			nw,
			this.capacity,
			this.depth + 1,
			this.maxDepth,
			this.minSize
		);
		const se = { x: x + width / 2, y: y + height / 2, width: width / 2, height: height / 2 };
		this.southeast = new QuadTreeNode(
			se,
			this.capacity,
			this.depth + 1,
			this.maxDepth,
			this.minSize
		);
		const sw = { x: x, y: y + height / 2, width: width / 2, height: height / 2 };
		this.southwest = new QuadTreeNode(
			sw,
			this.capacity,
			this.depth + 1,
			this.maxDepth,
			this.minSize
		);

		if (this.particles.length > 0) {
			// Re-insert existing particles into the appropriate child nodes
			const existingParticles = this.particles;
			this.particles = [];
			for (const p of existingParticles) {
				if (!this.insertIntoChildren(p)) {
					// Keep it in this node as a fallback for precision edge cases.
					this.particles.push(p);
				}
			}
		}
		this.divided = true;
		return true;
	}
	insert(particle: Particle): boolean {
		const { x, y, width, height } = this.boundary;
		// Check if particle is out of bounds for this node
		if (particle.x < x || particle.x >= x + width || particle.y < y || particle.y >= y + height) {
			return false;
		}

		if (!this.divided) {
			// If not divided and capacity not reached, add particle here
			if (this.particles.length < this.capacity) {
				this.particles.push(particle);
				return true;
			}
			// If subdivision limit reached add particle here to avoid subdivision limit
			if (!this.subdivide()) {
				this.particles.push(particle);
				return true;
			}
		}

		// Recursively insert into the appropriate quadrant (this works because it will return false if the particle is out of bounds for that quadrant)
		if (this.insertIntoChildren(particle)) {
			return true;
		}

		// Fallback for precision edge cases.
		this.particles.push(particle);
		return true;
	}
	query(
		range: { x: number; y: number; width: number; height: number },
		found: Particle[] = []
	): Particle[] {
		const { x, y, width, height } = this.boundary;
		if (
			range.x > x + width ||
			range.x + range.width < x ||
			range.y > y + height ||
			range.y + range.height < y
		) {
			return found;
		}
		for (const p of this.particles) {
			if (
				p.x >= range.x &&
				p.x < range.x + range.width &&
				p.y >= range.y &&
				p.y < range.y + range.height
			) {
				found.push(p);
			}
		}
		if (this.divided) {
			this.northeast!.query(range, found);
			this.northwest!.query(range, found);
			this.southeast!.query(range, found);
			this.southwest!.query(range, found);
		}
		return found;
	}
	calculateTotal() {
		this.charge = 0;
		this.absCharge = 0;
		let sumX = 0;
		let sumY = 0;

		// Sum particle charge in this specific node
		for (const p of this.particles) {
			this.charge += p.charge;
			this.absCharge += Math.abs(p.charge);
			sumX += p.x * p.charge;
			sumY += p.y * p.charge;
		}

		// Sum particle charge in children nodes
		if (this.divided) {
			const children = [this.northeast, this.northwest, this.southeast, this.southwest];
			for (const child of children) {
				if (!child) continue;
				child.calculateTotal();
				this.charge += child.charge;
				this.absCharge += child.absCharge;
				sumX += child.comX * child.charge;
				sumY += child.comY * child.charge;
			}
		}

		// Calculate Center of Mass for this node
		if (this.charge !== 0) {
			this.comX = sumX / this.charge;
			this.comY = sumY / this.charge;
		} else {
			// If empty box use geometric center
			this.comX = this.boundary.x + this.boundary.width / 2;
			this.comY = this.boundary.y + this.boundary.height / 2;
		}
	}
	containsPoint(particle: Particle): boolean {
		const { x, y, width, height } = this.boundary;
		return particle.x >= x && particle.x < x + width && particle.y >= y && particle.y < y + height;
	}
	calculateForceOn(particle: Particle, theta: number = 0.5): { fx: number; fy: number } {
		const dx = particle.x - this.comX;
		const dy = particle.y - this.comY;
		const distSq = dx * dx + dy * dy + EPS2;
		const dist = Math.sqrt(distSq);

		const canApproximate =
			this.divided && !this.containsPoint(particle) && this.boundary.width / dist < theta;

		// Apply Barnes-Hut approximation
		if (canApproximate) {
			const force = (K * this.charge * particle.charge) / distSq;
			return {
				fx: force * (dx / dist),
				fy: force * (dy / dist)
			};
		} else {
			let fx = 0;
			let fy = 0;

			if (this.divided) {
				const children = [this.northeast, this.northwest, this.southeast, this.southwest];
				for (const child of children) {
					if (child) {
						const childForce = child.calculateForceOn(particle, theta);
						fx += childForce.fx;
						fy += childForce.fy;
					}
				}
			}

			for (const p of this.particles) {
				if (p === particle) continue;

				const pdx = particle.x - p.x;
				const pdy = particle.y - p.y;
				const pDistSq = pdx * pdx + pdy * pdy + EPS2;
				const pDist = Math.sqrt(pDistSq);

				if (pDist < 0.0001) continue;

				const pForce = (K * p.charge * particle.charge) / pDistSq;

				fx += pForce * (pdx / pDist);
				fy += pForce * (pdy / pDist);
			}

			return { fx, fy };
		}
	}
	calculateFieldAt(
		x: number,
		y: number,
		theta: number = 0.3,
		cancellationThreshold: number = 0.15
	): { fx: number; fy: number } {
		const dx = x - this.comX;
		const dy = y - this.comY;
		const distSq = dx * dx + dy * dy + EPS2;
		const dist = Math.sqrt(distSq);
		const size = Math.max(this.boundary.width, this.boundary.height);
		const cancellationRatio = this.absCharge > 0 ? Math.abs(this.charge) / this.absCharge : 1;

		const canApproximate =
			this.divided &&
			Math.abs(this.charge) > 0 &&
			cancellationRatio >= cancellationThreshold &&
			size / dist < theta;

		if (canApproximate) {
			const field = (K * this.charge) / distSq;
			return {
				fx: field * (dx / dist),
				fy: field * (dy / dist)
			};
		}

		let fx = 0;
		let fy = 0;

		if (this.divided) {
			const children = [this.northeast, this.northwest, this.southeast, this.southwest];
			for (const child of children) {
				if (!child) continue;
				const childField = child.calculateFieldAt(x, y, theta, cancellationThreshold);
				fx += childField.fx;
				fy += childField.fy;
			}
		}

		for (const p of this.particles) {
			const pdx = x - p.x;
			const pdy = y - p.y;
			const pDistSq = pdx * pdx + pdy * pdy + EPS2;
			const pDist = Math.sqrt(pDistSq);
			if (pDist < 0.0001) continue;

			const pField = (K * p.charge) / pDistSq;
			fx += pField * (pdx / pDist);
			fy += pField * (pdy / pDist);
		}

		return { fx, fy };
	}
}
export default class QuadTree {
	root: QuadTreeNode;
	constructor(
		boundary: { x: number; y: number; width: number; height: number },
		capacity: number,
		maxDepth: number = DEFAULT_MAX_DEPTH,
		minSize: number = DEFAULT_MIN_SIZE
	) {
		this.root = new QuadTreeNode(boundary, capacity, 0, maxDepth, minSize);
	}
	insert(particle: Particle): boolean {
		return this.root.insert(particle);
	}
	query(range: { x: number; y: number; width: number; height: number }): Particle[] {
		return this.root.query(range);
	}
	calculateFieldAt(
		x: number,
		y: number,
		theta: number = 0.3,
		cancellationThreshold: number = 0.15
	): { fx: number; fy: number } {
		return this.root.calculateFieldAt(x, y, theta, cancellationThreshold);
	}
}
