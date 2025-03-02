// Linked list class.
class LinkedList
{
	// Class constructor.
	constuctor()
	{
		this.head = null;
		this.tail = null;
	}
	//
	add(value)
	{
		var node = new Node(value);
		if (this.head == null)
		{
			this.head = node;
			this.tail = node;
		}
		else
		{
			node.previous = this.tail;
			this.tail.next = node;
			this.tail = node;
		}
	}
	//
	remove(node)
	{
		if (this.head == node && this.tail == node)
		{
			this.head = null;
			this.tail = null;
		}
		else if (this.head == node)
		{
			this.head = this.head.next;
			this.head.previous = null;
		}
		else if (this.tail == node)
		{
			this.tail = this.tail.previous;
			this.tail.next = null;
		}
		else
		{
			node.previous.next = node.next;
			node.next.previous = node.previous;
		}
	}
}